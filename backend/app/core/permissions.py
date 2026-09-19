"""
Role-Based Access Control (RBAC) Permissions Matrix.
Strictly defines staff permissions according to the Backend Master Specification.
"""

from typing import Set
from app.core.constants import AdminRole


ROLE_PERMISSIONS = {
    AdminRole.SUPER_ADMIN: {
        "orders:view", "orders:verify", "orders:cancel",
        "payouts:view", "payouts:execute",
        "payments:view", "payments:verify",
        "pricing:view", "pricing:manage",
        "sims:view", "sims:manage",
        "inventory:view", "inventory:adjust",
        "support:view", "support:manage",
        "audit:view", "users:manage", "settings:manage"
    },
    AdminRole.ADMIN: {
        "orders:view", "orders:verify", "orders:cancel",
        "payouts:view", "payouts:execute",
        "payments:view", "payments:verify",
        "pricing:view", "pricing:manage",
        "sims:view", "sims:manage",
        "inventory:view", "inventory:adjust",
        "support:view", "support:manage",
        "audit:view", "users:manage"
    },
    AdminRole.FINANCE: {
        "orders:view",
        "payouts:view", "payouts:execute",
        "payments:view", "payments:verify",
        "inventory:view", "inventory:adjust",
        "pricing:view",  # Read-only! Cannot change pricing.
        "audit:view"
    },
    AdminRole.VERIFIER: {
        "orders:view", "orders:verify",
        "support:view"
    },
    AdminRole.OPERATIONS: {
        "orders:view", "orders:verify",
        "sims:view", "sims:manage",
        "inventory:view", "inventory:adjust",
        "payments:view", "payments:verify",
        "support:view", "support:manage"
    },
    AdminRole.SUPPORT: {
        "orders:view",
        "support:view", "support:manage",
        "pricing:view"  # Cannot change pricing or payouts
    }
}


def role_has_permission(role: AdminRole, permission: str) -> bool:
    role_perms = ROLE_PERMISSIONS.get(role, set())
    return permission in role_perms
