install:
	npm install

lint:
	npx eslint .
	
lint-fix:
	npx eslint . --fix	

publish:
	npm publish --dry-run

test:
	npm test

test-watch:
	npm test -- --watch

test-coverage:
	npm test -- --coverage --coverageProvider=v8

develop:
	npx webpack serve

build:
	rm -rf dist
	NODE_ENV=production npx webpack
	npm run beautify

.PHONY: test