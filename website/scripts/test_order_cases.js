const http = require('http');

async function req(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/v1' + path,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    if (body) {
      opts.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          resolve({ raw: d, status: res.statusCode });
        }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function formatBDT(amount, options = {}) {
  if (amount === null || amount === undefined || amount === '') return '৳0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '৳0';
  const absNum = Math.abs(num);
  let formatted = (absNum % 1 !== 0)
    ? absNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : absNum.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return (options.isDeduction ? '−৳' : '৳') + formatted;
}

async function runTests() {
  console.log('===========================================================');
  console.log('AUDIT & VERIFY ORDER DETAIL MONEY / DISCOUNT DISPLAY CASES');
  console.log('===========================================================\n');

  const guest = await req('/guest/session', 'POST');
  const guestId = guest.guest_session_id;
  console.log('Guest Session Initialized:', guestId);

  const testCases = [
    {
      type: 'RECHARGE',
      operator: 'GP',
      phone: '01712345678',
      amount: '100',
      expectedRechargeVal: '৳100',
      expectedDiscount: '−৳5',
      expectedDiscountRate: '5%',
      expectedPayable: '৳95',
    },
    {
      type: 'RECHARGE',
      operator: 'ROBI',
      phone: '01812345678',
      amount: '500',
      expectedRechargeVal: '৳500',
      expectedDiscount: '−৳25',
      expectedDiscountRate: '5%',
      expectedPayable: '৳475',
    },
    {
      type: 'RECHARGE',
      operator: 'BANGLALINK',
      phone: '01912345678',
      amount: '1000',
      expectedRechargeVal: '৳1,000',
      expectedDiscount: '−৳50',
      expectedDiscountRate: '5%',
      expectedPayable: '৳950',
    },
    {
      type: 'CASHOUT',
      operator: 'GP',
      phone: '01712345678',
      amount: '100',
      expectedBalance: '৳100',
      expectedFee: '−৳20',
      expectedFeeRate: '20%',
      expectedPayout: '৳80',
    },
    {
      type: 'CASHOUT',
      operator: 'ROBI',
      phone: '01812345678',
      amount: '1000',
      expectedBalance: '৳1,000',
      expectedFee: '−৳200',
      expectedFeeRate: '20%',
      expectedPayout: '৳800',
    },
  ];

  let allPassed = true;

  for (const tc of testCases) {
    console.log(`\nTesting ${tc.type} Order for ৳${tc.amount}...`);
    let orderCreated;
    if (tc.type === 'RECHARGE') {
      orderCreated = await req('/recharge/orders', 'POST', {
        operator_code: tc.operator,
        recharge_mobile_number: tc.phone,
        recharge_amount_bdt: tc.amount
      }, { 'X-Guest-Session-ID': guestId });
    } else {
      orderCreated = await req('/cashout/orders', 'POST', {
        operator_code: tc.operator,
        source_mobile_number: tc.phone,
        amount_bdt: tc.amount,
        payout_method: 'BKASH',
        payout_account: '01712345678'
      }, { 'X-Guest-Session-ID': guestId });
    }

    if (!orderCreated || !orderCreated.order_id) {
      console.error(`  ❌ Order creation failed:`, orderCreated);
      allPassed = false;
      continue;
    }

    console.log(`  Created Order: ${orderCreated.order_id}`);

    // Fetch order details
    const order = await req('/orders/' + orderCreated.order_id, 'GET', null, { 'X-Guest-Session-ID': guestId });

    if (tc.type === 'RECHARGE') {
      const rechargeVal = formatBDT(
        order.pricing_snapshot?.recharge_amount_bdt ||
        order.recharge_details?.recharge_amount_bdt ||
        (order.recharge_details?.recharge_amount ? order.recharge_details.recharge_amount / 100 : order.amount_bdt)
      );

      const discount = formatBDT(
        order.pricing_snapshot?.discount_amount_bdt ||
        order.recharge_details?.discount_amount_bdt ||
        (order.recharge_details?.discount_amount ? order.recharge_details.discount_amount / 100 : 0),
        { isDeduction: true }
      );

      const payable = formatBDT(
        order.pricing_snapshot?.customer_pay_amount_bdt ||
        order.recharge_details?.customer_pay_amount_bdt ||
        order.amount_bdt
      );

      console.log(`    Recharge Value: ${rechargeVal} (Expected: ${tc.expectedRechargeVal})`);
      console.log(`    Discount Applied: ${discount} (Expected: ${tc.expectedDiscount})`);
      console.log(`    Amount to Pay: ${payable} (Expected: ${tc.expectedPayable})`);

      if (rechargeVal !== tc.expectedRechargeVal) {
        console.error(`  ❌ Recharge Value mismatch!`);
        allPassed = false;
      }
      if (discount !== tc.expectedDiscount) {
        console.error(`  ❌ Discount mismatch!`);
        allPassed = false;
      }
      if (payable !== tc.expectedPayable) {
        console.error(`  ❌ Payable mismatch!`);
        allPassed = false;
      }

      // Check payment status logic
      const paymentStatus = order.status === "PAYMENT_PENDING"
        ? (order.payment_id ? "Payment Verification Pending" : "Awaiting Payment Submission")
        : ["PAYMENT_VERIFIED", "RECHARGE_PROCESSING", "COMPLETED"].includes(order.status)
        ? "Payment Verified"
        : order.status;

      console.log(`    Payment Status: "${paymentStatus}" (Initial order has no payment linked yet)`);
      if (order.status === "PAYMENT_PENDING" && !order.payment_id && paymentStatus !== "Awaiting Payment Submission") {
        console.error(`  ❌ Unexpected payment status display!`);
        allPassed = false;
      }
    } else {
      const simBalance = formatBDT(
        order.pricing_snapshot?.source_amount_bdt ||
        order.cashout_details?.source_amount_bdt ||
        order.amount_bdt
      );

      const fee = formatBDT(
        order.pricing_snapshot?.platform_fee_amount_bdt ||
        order.cashout_details?.platform_fee_amount_bdt ||
        (order.cashout_details?.platform_fee_amount ? order.cashout_details.platform_fee_amount / 100 : 0),
        { isDeduction: true }
      );

      const payout = formatBDT(
        order.pricing_snapshot?.payout_amount_bdt ||
        order.cashout_details?.payout_amount_bdt ||
        (order.cashout_details?.payout_amount ? order.cashout_details.payout_amount / 100 : 0)
      );

      console.log(`    SIM Balance: ${simBalance} (Expected: ${tc.expectedBalance})`);
      console.log(`    Platform Fee: ${fee} (Expected: ${tc.expectedFee})`);
      console.log(`    Net Payout Due: ${payout} (Expected: ${tc.expectedPayout})`);

      if (simBalance !== tc.expectedBalance) {
        console.error(`  ❌ SIM Balance mismatch!`);
        allPassed = false;
      }
      if (fee !== tc.expectedFee) {
        console.error(`  ❌ Fee mismatch!`);
        allPassed = false;
      }
      if (payout !== tc.expectedPayout) {
        console.error(`  ❌ Payout mismatch!`);
        allPassed = false;
      }
    }
  }

  console.log('\n===========================================================');
  if (allPassed) {
    console.log('🎉 ALL 5 ORDER DETAIL TEST CASES PASSED PERFECTLY!');
  } else {
    console.error('❌ SOME ORDER DETAIL TEST CASES FAILED.');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
