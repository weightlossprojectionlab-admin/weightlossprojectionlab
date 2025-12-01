#!/bin/bash
# Post-Deployment Validation Script
# Usage: bash scripts/post-deploy-validation.sh https://your-app.com

BASE_URL="${1:-http://localhost:3000}"

echo "🔍 Post-Deployment Validation"
echo "=============================="
echo "Testing: $BASE_URL"
echo ""

# Check application health
echo "🏥 Checking application health..."
curl -f "$BASE_URL" > /dev/null 2>&1 && echo "✅ Application accessible" || echo "❌ Application not accessible"

# Check security headers
echo "🔒 Checking security headers..."
curl -I "$BASE_URL" 2>/dev/null | grep -i "Cross-Origin-Opener-Policy" && echo "✅ COOP header present" || echo "⚠️  COOP header missing"

# Check debug endpoints blocked
echo "🐛 Checking debug endpoints..."
curl -f "$BASE_URL/api/debug-profile" > /dev/null 2>&1 && echo "❌ Debug endpoints accessible!" || echo "✅ Debug endpoints blocked"

echo ""
echo "✅ Post-deployment validation complete!"
echo ""
echo "Next steps:"
echo "  1. Test critical user flows"
echo "  2. Monitor error logs"
echo "  3. Watch for user reports"
