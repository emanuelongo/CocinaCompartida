# SonarQube Configuration TODO

## Progress:

| Step | Status |
|------|--------|
| Create sonar-project.properties | ✅ Completed |

## Next Steps:
- [x] Create sonar-project.properties ✅
- [ ] Run tests and generate coverage:
  - Frontend: cd cocina-compartida && ng test --code-coverage
  - Backend: cd cocina-compartida-api && npm run test:cov
- [ ] Install SonarScanner globally: npm install -g sonar-scanner
- [ ] Run sonar-scanner at root
- [ ] Access SonarQube dashboard (configure sonar.host.url and token in sonar-project.properties if using remote server)
