#!/data/data/com.termux/files/usr/bin/bash

set -u

echo "=============================================="
echo " Fundza Legal / Database Safety Audit"
echo " READ ONLY - NO DATABASE CHANGES"
echo "=============================================="

echo ""
echo "1. Git branch"
echo "----------------------------------------------"
git branch --show-current

echo ""
echo "2. Git status"
echo "----------------------------------------------"
git status --short

echo ""
echo "3. Checking local environment"
echo "----------------------------------------------"

if [ -f ".env.local" ]; then
    echo ".env.local found"

    if grep -q "^NEXT_PUBLIC_SUPABASE_URL=" .env.local; then
        echo "NEXT_PUBLIC_SUPABASE_URL: configured"
    else
        echo "NEXT_PUBLIC_SUPABASE_URL: MISSING"
    fi

    if grep -q "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local; then
        echo "NEXT_PUBLIC_SUPABASE_ANON_KEY: configured"
    else
        echo "NEXT_PUBLIC_SUPABASE_ANON_KEY: MISSING"
    fi
else
    echo ".env.local NOT FOUND"
fi

echo ""
echo "4. Checking existing legal application files"
echo "----------------------------------------------"

for path in \
    "app/terms" \
    "app/privacy" \
    "app/copyright" \
    "app/legal" \
    "components/Legal" \
    "components/ConsentGate"
do
    if [ -e "$path" ]; then
        echo "FOUND: $path"
    else
        echo "NOT FOUND: $path"
    fi
done

echo ""
echo "5. Searching code for existing legal/consent handling"
echo "----------------------------------------------"

grep -Rni \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    --exclude-dir=.git \
    -E "terms|privacy|consent|accept|agreement|legal_acceptance|guardian" \
    app components lib types data 2>/dev/null \
    | head -100 || true

echo ""
echo "6. Checking Supabase REST access"
echo "----------------------------------------------"

if [ ! -f ".env.local" ]; then
    echo "Cannot inspect Supabase because .env.local is missing."
    exit 0
fi

SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | head -1 | cut -d '=' -f2-)
SUPABASE_KEY=$(grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local | head -1 | cut -d '=' -f2-)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "Supabase environment variables are incomplete."
    exit 0
fi

if ! command -v curl >/dev/null 2>&1; then
    echo "curl is not installed."
    echo "Install with: pkg install curl"
    exit 0
fi

echo "Supabase URL configured."
echo ""
echo "Checking known/application tables..."

TABLES="
students
student_subjects
subjects_catalog
schools
grades
legal_acceptances
privacy_consents
terms_acceptances
parent_guardian_consents
"

for TABLE in $TABLES; do

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "apikey: $SUPABASE_KEY" \
        -H "Authorization: Bearer $SUPABASE_KEY" \
        "$SUPABASE_URL/rest/v1/$TABLE?select=*&limit=1")

    case "$HTTP_CODE" in
        200)
            echo "FOUND/ACCESSIBLE: $TABLE"
            ;;
        401|403)
            echo "EXISTS OR BLOCKED BY RLS: $TABLE (HTTP $HTTP_CODE)"
            ;;
        404)
            echo "NOT FOUND: $TABLE"
            ;;
        *)
            echo "UNKNOWN: $TABLE (HTTP $HTTP_CODE)"
            ;;
    esac
done

echo ""
echo "7. Checking for Supabase migration directory"
echo "----------------------------------------------"

if [ -d "supabase" ]; then
    echo "supabase/ directory exists"
    find supabase -maxdepth 2 -type f -print
else
    echo "No supabase/ directory found."
fi

echo ""
echo "=============================================="
echo " AUDIT COMPLETE"
echo " NO DATABASE CHANGES WERE MADE"
echo "=============================================="
