.PHONY: check check-api check-web fix fix-api fix-web install-hooks

# What the pre-push hook runs. check-api mirrors ci-api.yml exactly;
# check-web has no CI workflow of its own yet, but its pre-existing
# react-hooks/set-state-in-effect errors are fixed now, so there's no
# reason left to exclude it from the local gate.
check: check-api check-web

check-api:
	cd api && vendor/bin/pint --test
	cd api && php artisan test

check-web:
	cd web && pnpm lint --max-warnings=0
	cd web && pnpm typecheck

# Auto-fixes what can be auto-fixed (style only — a failing test or a type
# error needs a real fix, not this).
fix: fix-api fix-web

fix-api:
	cd api && vendor/bin/pint

fix-web:
	cd web && pnpm lint --fix

# One-time per clone — .git/hooks isn't tracked by git, so the hook itself
# lives in scripts/git-hooks/ and gets symlinked in here.
install-hooks:
	ln -sf ../../scripts/git-hooks/pre-push .git/hooks/pre-push
	chmod +x scripts/git-hooks/pre-push
	@echo "pre-push hook installed — 'make check' now runs before every push (bypass with git push --no-verify)"
