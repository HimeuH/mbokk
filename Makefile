.PHONY: check check-all check-api check-web fix fix-api fix-web install-hooks

# Mirrors exactly what CI runs (.github/workflows/ci-api.yml) — this is
# what the pre-push hook calls, so it only blocks on what would actually
# fail in GitHub today. web/ has no CI workflow yet (see check-web below),
# so it's deliberately excluded here — use `make check-all` to include it.
check: check-api

# Everything, including web/ — not run by the pre-push hook yet since
# web/'s pre-existing react-hooks/set-state-in-effect lint errors aren't
# fixed yet and nothing in CI checks web/ regardless. Fold web/ into
# `check` once both are true.
check-all: check-api check-web

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
