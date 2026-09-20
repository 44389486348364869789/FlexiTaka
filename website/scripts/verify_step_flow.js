const http = require('http');
const fs = require('fs');
const path = require('path');

async function fetchPage(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${urlPath}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
      res.on('error', reject);
    });
  });
}

async function testBackendQuote(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let respData = '';
      res.on('data', (chunk) => (respData += chunk));
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(respData) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runVerification() {
  console.log('===========================================================');
  console.log('FLEXITAKA AMOUNT UI CLEANUP + FACEBOOK LINK VERIFICATION');
  console.log('===========================================================\n');

  let allPassed = true;

  // 1. Check Landing, Calculator, and Pricing Pages
  const pages = [
    { url: '/', name: 'Homepage (/)' },
    { url: '/cash-out', name: 'Cash Out Landing (/cash-out)' },
    { url: '/recharge', name: 'Recharge Landing (/recharge)' },
    { url: '/pricing', name: 'Pricing Page (/pricing)' },
  ];

  for (const page of pages) {
    console.log(`Checking ${page.name}...`);
    const res = await fetchPage(page.url);
    if (res.status !== 200) {
      console.error(`  ❌ HTTP Status ${res.status}`);
      allPassed = false;
      continue;
    }

    // Check placeholder attribute on amount input is "Amount"
    if (res.body.includes('placeholder="Amount"')) {
      console.log(`  ✓ Pass: Amount input placeholder is "Amount".`);
    } else {
      console.error(`  ❌ FAIL: "Amount" placeholder not found in ${page.url}`);
      allPassed = false;
    }

    // Check "Enter an amount" is NOT used as placeholder
    if (res.body.includes('placeholder="Enter an amount"') || res.body.includes('placeholder="Enter amount"')) {
      console.error(`  ❌ FAIL: Old placeholder "Enter an amount" still found in ${page.url}`);
      allPassed = false;
    } else {
      console.log(`  ✓ Pass: Old placeholder "Enter an amount" is gone.`);
    }

    // Check no preset buttons
    if (res.body.includes('aria-label="Preset amounts"') || res.body.includes('Preset amounts')) {
      console.error(`  ❌ FAIL: Preset buttons found in ${page.url}`);
      allPassed = false;
    } else {
      console.log(`  ✓ Pass: No preset amount buttons in ${page.url}.`);
    }

    // Check Facebook link in footer
    if (res.body.includes('https://www.facebook.com/FlexiTaka0/')) {
      console.log(`  ✓ Pass: Official Facebook page link present in footer.`);
    } else {
      console.error(`  ❌ FAIL: Official Facebook page link missing from ${page.url}`);
      allPassed = false;
    }

    if (res.body.includes('aria-label="FlexiTaka on Facebook"')) {
      console.log(`  ✓ Pass: Facebook link has accessible aria-label.`);
    } else {
      console.error(`  ❌ FAIL: Facebook accessible aria-label missing from ${page.url}`);
      allPassed = false;
    }

    if (res.body.includes('rel="noopener noreferrer"') && res.body.includes('target="_blank"')) {
      console.log(`  ✓ Pass: Facebook link opens securely in new tab.`);
    } else {
      console.error(`  ❌ FAIL: Facebook target="_blank" or rel attributes missing.`);
      allPassed = false;
    }

    console.log('');
  }

  // 2. Check Client App Wizards source files (/app/recharge & /app/cashout)
  console.log('Checking Web App Wizards source files...');
  const rechargeSrc = fs.readFileSync(path.join(__dirname, '../src/app/app/recharge/page.tsx'), 'utf-8');
  if (rechargeSrc.includes('placeholder="Amount"')) {
    console.log('  ✓ Pass: /app/recharge amount input placeholder is "Amount".');
  } else {
    console.error('  ❌ FAIL: /app/recharge placeholder is not "Amount".');
    allPassed = false;
  }
  if (!rechargeSrc.includes('PresetAmounts')) {
    console.log('  ✓ Pass: /app/recharge has PresetAmounts completely removed.');
  } else {
    console.error('  ❌ FAIL: /app/recharge still has PresetAmounts.');
    allPassed = false;
  }

  const cashoutSrc = fs.readFileSync(path.join(__dirname, '../src/app/app/cashout/page.tsx'), 'utf-8');
  if (cashoutSrc.includes('placeholder="Amount"')) {
    console.log('  ✓ Pass: /app/cashout amount input placeholder is "Amount".');
  } else {
    console.error('  ❌ FAIL: /app/cashout placeholder is not "Amount".');
    allPassed = false;
  }
  if (!cashoutSrc.includes('PresetAmounts')) {
    console.log('  ✓ Pass: /app/cashout has PresetAmounts completely removed.');
  } else {
    console.error('  ❌ FAIL: /app/cashout still has PresetAmounts.');
    allPassed = false;
  }

  // Check globals.css for placeholder styling and footer focus
  const cssSrc = fs.readFileSync(path.join(__dirname, '../src/styles/globals.css'), 'utf-8');
  if (cssSrc.includes('.form-input::placeholder') && cssSrc.includes('16px')) {
    console.log('  ✓ Pass: globals.css contains 16px font-size for .form-input::placeholder.');
  } else {
    console.error('  ❌ FAIL: globals.css missing 16px placeholder styling.');
    allPassed = false;
  }

  if (cssSrc.includes('.footer-social-link:focus-visible')) {
    console.log('  ✓ Pass: globals.css contains visible keyboard focus outline for footer social link.');
  } else {
    console.error('  ❌ FAIL: globals.css missing visible focus styling for footer link.');
    allPassed = false;
  }

  console.log('');

  // 3. Check Live Authoritative Backend Pricing API
  console.log('Checking Backend Authoritative Pricing Quote API...');
  const coQuote1000 = await testBackendQuote('http://localhost:8000/api/v1/pricing/cashout-quote', {
    operator_code: 'GP',
    amount_bdt: '1000',
  });
  if (coQuote1000.data.platform_fee_amount_bdt === '200.00' && coQuote1000.data.payout_amount_bdt === '800.00') {
    console.log('  ✓ Pass: Backend Cash Out ৳1,000 -> 20% platform fee (৳200.00), Payout (৳800.00).');
  } else {
    console.error('  ❌ FAIL: Backend Cash Out quote unexpected:', coQuote1000.data);
    allPassed = false;
  }

  const recQuote1000 = await testBackendQuote('http://localhost:8000/api/v1/pricing/recharge-quote', {
    operator_code: 'ROBI',
    recharge_amount_bdt: '1000',
  });
  if (recQuote1000.data.discount_amount_bdt === '50.00' && recQuote1000.data.customer_pay_amount_bdt === '950.00') {
    console.log('  ✓ Pass: Backend Recharge ৳1,000 -> 5% discount (৳50.00), You Pay (৳950.00).');
  } else {
    console.error('  ❌ FAIL: Backend Recharge quote unexpected:', recQuote1000.data);
    allPassed = false;
  }

  console.log('\n===========================================================');
  if (allPassed) {
    console.log('🎉 ALL AMOUNT UI CLEANUP & FACEBOOK LINK CHECKS PASSED!');
  } else {
    console.log('❌ SOME CHECKS FAILED.');
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
