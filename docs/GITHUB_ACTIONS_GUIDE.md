# GitHub Actions CI/CD Guide - Lab 03

This document explains the CI pipeline configured for our contract testing suite.

## 1. Workflow Structure

The workflow is defined in `.github/workflows/newman.yml`. It runs automatically under two conditions:
1. Every `push` to `master` or `main`.
2. Every `pull_request` targeting `master` or `main`.

---

## 2. Jobs and Execution Steps

The CI pipeline runs inside an Ubuntu Linux container and performs the following jobs:

1. **Checkout Code**: Copies files to the runner workspace.
2. **Setup Node.js**: Installs Node v20 with npm caching enabled.
3. **Install Dependencies**: Runs `npm install --legacy-peer-deps` to fetch Express, Newman, Prism, and Spectral.
4. **Run Contract and Integration Tests**:
   - Executes the unified shell runner `./scripts/run_tests.sh`.
   - Runs Spectral linting to check contract rules.
   - Spins up Prism server and executes Newman mock tests.
   - Spins up Express server and executes Newman local tests.
5. **Upload Test Reports**:
   - Saves Newman HTML reports, JUnit XML logs, and Spectral lint results as a workflow artifact named `newman-reports`.

---

## 3. How to View Results and Reports

1. Go to the **Actions** tab on your GitHub repository.
2. Select the latest workflow run.
3. Scroll down to the **Artifacts** section at the bottom.
4. Click on `newman-reports` to download the zip file containing:
   - `reports/newman-mock-report.html` (Mock run detail)
   - `reports/newman-local-report.html` (Local run detail)
   - `reports/spectral-lint.log` (Linter validation proof)
