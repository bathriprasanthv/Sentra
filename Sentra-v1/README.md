# SENTRA
### Continuous Session Security & Behavioral Monitoring System

**Understand every session. Respond to every change.**

SENTRA is a session-security monitoring prototype designed to identify suspicious activity that occurs after a user has successfully authenticated. Instead of assuming that a valid login guarantees continued security, SENTRA monitors session activity, evaluates behavioral deviations, assesses security risk, and supports appropriate responses.

The project combines behavioral monitoring, configurable security rules, anomaly detection, and a security dashboard to demonstrate how continuous session security can help identify potentially compromised sessions.

> **Project status:** Prototype for educational and defensive cybersecurity demonstrations. Attack scenarios are simulated in a controlled local environment.

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Objectives](#objectives)
- [Key Features](#key-features)
- [How SENTRA Works](#how-sentra-works)
- [Drift Score vs. Risk Score](#drift-score-vs-risk-score)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Running the Application](#running-the-application)
- [Ethical Hacking Lab](#ethical-hacking-lab)
- [Security Responses](#security-responses)
- [Machine Learning Approach](#machine-learning-approach)
- [Security Considerations](#security-considerations)
- [Current Limitations](#current-limitations)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## Overview

Traditional authentication verifies a user's identity at login. However, a session that was legitimate at the beginning may later exhibit suspicious behavior.

For example, a session may begin making unusually frequent requests, exploring unexpected endpoints, accessing sensitive resources, or behaving differently from its established baseline.

SENTRA addresses this problem by focusing on **continuous session monitoring after authentication**.

The system is designed around the following principles:

- Observe session activity continuously.
- Establish and evaluate behavioral patterns.
- Identify deviations from expected behavior.
- Assess security risk using available evidence.
- Present security events and incidents for investigation.
- Support policy-based responses to suspicious activity.

SENTRA is intended as a learning and demonstration platform for understanding session security, behavioral anomaly detection, and security operations workflows.

## Problem Statement

Authentication alone cannot guarantee that an active session remains secure throughout its lifetime.

Session identifiers and authentication tokens may be exposed through vulnerabilities, compromised devices, or insecure application practices. An attacker who obtains a valid session credential may attempt to reuse it without knowing the user's password.

Even without confirmed credential theft, unusual activity within an authenticated session may indicate a security concern.

Many basic applications focus primarily on login-time verification and do not provide sufficient visibility into changes in session behavior.

SENTRA explores how continuous behavioral monitoring and risk-based security responses can help address this gap.

## Objectives

1. Monitor authenticated session activity beyond the initial login.
2. Collect relevant telemetry from a controlled demonstration application.
3. Identify deviations from normal session behavior.
4. Combine behavioral analysis with security rules and contextual information.
5. Represent behavioral deviation and security risk as separate scores.
6. Present events, sessions, and incidents through a centralized security dashboard.
7. Demonstrate defensive responses through controlled ethical hacking scenarios.
8. Provide an extensible foundation for further session-security research.

---

## Key Features

### 1. Continuous Session Monitoring

Observe session activity such as page navigation, API request patterns, request failures, and sensitive actions supported by the demonstration application.

### 2. Behavioral Drift Detection

Compare observed session activity against an established or configured behavioral baseline to identify unusual patterns.

### 3. Risk Assessment

Evaluate the security significance of observed activity using configured rules, behavioral signals, and available context.

### 4. Security Operations Dashboard

The frontend includes dedicated security views for monitoring and investigation.

| Page | Purpose |
|---|---|
| Security Dashboard | Overview of security activity and monitoring information |
| Security Events | Review recorded security events |
| Security Incidents | Review and investigate incidents |
| Security Lab | Run supported local demonstration scenarios |
| Security Sessions | Inspect monitored sessions |
| Session Details | Review the activity and information associated with a session |

The application also contains general application pages for login, dashboard, products, profile, reports, and settings.

### 5. Ethical Hacking Lab

Demonstrate selected attack-like behaviors safely against the controlled application rather than targeting real users or external systems.

### 6. Real-Time Monitoring Interface

The frontend is designed to display changing security information as events are received from the backend. Live updates depend on the WebSocket connection and event pipeline being implemented and running correctly.

### 7. Adaptive Security Responses

Support configurable responses based on the assessed risk, such as increased monitoring, re-verification, or restricting sensitive actions where those controls are implemented.

### 8. Explainable Security Information

Separate behavioral deviation from overall risk so that investigators can better understand why an event may require attention.

---

## How SENTRA Works

The intended monitoring workflow consists of the following stages.

### Step 1: User Authentication

A user signs in to the controlled application and establishes an authenticated session.

### Step 2: Session Observation

The application collects relevant activity and context, such as:

- Login and session timing
- Page visits and navigation order
- API request frequency
- Failed or unusual requests
- Access to sensitive application functions
- Available device or location context

Only telemetry supported by the implementation should be considered part of the active monitoring pipeline.

### Step 3: Behavioral Analysis

Observed activity is evaluated against the session's baseline and configured behavioral checks.

### Step 4: Drift Calculation

The Drift Engine estimates how much the observed behavior differs from expected behavior.

### Step 5: Risk Assessment

The Risk Engine evaluates how concerning the activity appears based on behavioral signals, security rules, and available context.

### Step 6: Incident Generation

Activity meeting configured detection criteria can be recorded or presented for further investigation.

### Step 7: Investigation

Security views provide access to available event records, session details, and incident information.

### Step 8: Adaptive Response

Depending on the implemented security policy, the application may continue normal activity, increase monitoring, request additional verification, or restrict sensitive operations.

**Workflow summary:**

`Demo Application → Session Observer → Security Engine → Drift Engine → Risk Engine → Incident Investigation → Adaptive Response`

This describes the intended architecture; individual stages must be connected and validated in the running application.

---

## Drift Score vs. Risk Score

SENTRA separates behavioral deviation from security risk because they answer different questions.

### Drift Score

The drift score represents the degree of deviation between observed session behavior and its baseline.

- Intended scale: `0.0–1.0`
- A value closer to `0.0` represents less measured deviation.
- A value closer to `1.0` represents greater measured deviation, assuming the implemented calculation uses this convention.

### Risk Score

The risk score represents the estimated security concern associated with the observed activity.

- Intended scale: `0–100`
- Higher values may trigger stronger responses according to configured policy.
- The score can account for security rules and context, rather than relying exclusively on behavioral deviation.

### Why use both?

A legitimate user changing devices may produce unusual behavior without representing an attack. Conversely, an unauthorized sensitive action may be serious even if the activity otherwise resembles normal behavior.

Keeping the scores separate makes the system easier to interpret and supports more appropriate security decisions.

> Score ranges, thresholds, weights, and response mappings are implementation-dependent. They should not be interpreted as validated probabilities of an attack.

---

## System Architecture

SENTRA is organized into frontend, backend, monitoring, analysis, and response components.

### Frontend

The frontend provides the user interface for application activity and security monitoring.

Responsibilities include:

- Authentication interface
- General application pages
- Security dashboard and event views
- Session and incident investigation
- Ethical hacking lab interface
- Presentation of backend-provided monitoring information

### Backend

The backend is intended to process incoming application events, maintain the relevant in-memory session state, evaluate activity, and expose information to the frontend.

### Security Engine

The security engine combines configured rules, behavioral analysis, available context, and anomaly-detection signals.

### Drift Engine

The Drift Engine evaluates how observed session activity differs from the established baseline.

### Risk Engine

The Risk Engine converts relevant security evidence into a risk assessment that can inform policy-based responses.

### Communication Layer

WebSockets support real-time communication between the backend and frontend where the connection and event pipeline are configured.

### State Management

The prototype is designed around in-memory session state, without a persistent application database in the described architecture. Unless persistence is added, state may be lost when the backend restarts.

### Architecture Diagram

```text
                 SENTRA FRONTEND
                  React + Vite
                       |
             REST API / WebSocket
                       |
                       v
                 FASTAPI BACKEND
                       |
                       v
                SESSION OBSERVER
                       |
                       v
                 SECURITY ENGINE
                /       |        \
             Rules   Baseline    ML
                \       |        /
                       v
                   DRIFT ENGINE
                       |
                       v
                    RISK ENGINE
                       |
              +--------+--------+
              |                 |
              v                 v
       Security Events    Response Policy
              |                 |
              v                 v
       Incident Review    Session Restrictions
                          (when implemented)
```

---

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Component-based frontend interface |
| Vite | Frontend development server and build tooling |
| JavaScript / JSX | Frontend application logic |
| CSS | Styling and responsive layouts |
| Python | Backend development and security analysis |
| FastAPI | Backend API framework |
| WebSockets | Real-time event delivery |
| NumPy | Numerical operations for analysis |
| Pandas | Data handling and feature preparation |
| Scikit-learn | Machine-learning and anomaly-detection components |
| Isolation Forest | Candidate unsupervised anomaly-detection algorithm |

The actual dependencies and versions are defined by the project's configuration files. Features such as Isolation Forest should be considered active only when they are implemented and connected to the event-processing pipeline.

---

## Project Structure

The following tree describes the visible frontend organization.

```text
SENTRA/
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── demoSession.js
│   │   │   ├── format.js
│   │   │   ├── useHealth.js
│   │   │   └── usePageTelemetry.js
│   │   │
│   │   ├── pages/
│   │   │   ├── app/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Products.jsx
│   │   │   │   ├── Profile.jsx
│   │   │   │   ├── Reports.jsx
│   │   │   │   └── Settings.jsx
│   │   │   │
│   │   │   └── security/
│   │   │       ├── SecDashboard.jsx
│   │   │       ├── SecEvents.jsx
│   │   │       ├── SecIncidents.jsx
│   │   │       ├── SecLab.jsx
│   │   │       ├── SecSessionDetail.jsx
│   │   │       └── SecSessions.jsx
│   │   ├── styles/
│   │   │   ├── app.css
│   │   │   ├── components.css
│   │   │   ├── layout.css
│   │   │   ├── security.css
│   │   │   └── theme.css
│   │   ├── ws/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── README.md
│
└── backend/
    └── ...
```

The backend tree is abbreviated because its exact file structure is not specified here.

---

## Prerequisites

Install the following tools before running the project:

- Node.js and npm
- Python 3.11 or another version supported by the backend dependencies
- Git (optional, for source control)
- A modern web browser

Check your installations:

```bash
node --version
npm --version
python --version
git --version
```

On some Linux systems, use `python3 --version` instead of `python --version`.

---

## Installation and Setup

### 1. Clone the repository

Replace the placeholder with your actual repository URL.

```bash
git clone <YOUR_REPOSITORY_URL>
cd SENTRA
```

If the project is already on your computer, navigate directly to its root directory.

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Configure frontend environment variables

If the frontend requires an API base URL or other configuration, create a local `.env` file using the variable names expected by the source code.

Example only:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

This variable is an example; confirm the actual name and usage in the project before relying on it.

Vite exposes variables prefixed with `VITE_` to frontend code. **Never place passwords, private API keys, signing secrets, or other confidential credentials in `VITE_` variables.**

### 4. Set up the backend

Open another terminal and navigate to the actual backend directory.

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Or, in Command Prompt:

```bat
.venv\Scripts\activate.bat
```

On Linux or macOS:

```bash
source .venv/bin/activate
```

Install the backend dependencies using the project's requirements file if one exists:

```bash
pip install -r requirements.txt
```

If the repository uses a different dependency manager or configuration file, follow that configuration instead. Do not install an assumed list of packages without checking the backend requirements.

### 5. Configure backend settings

Set the backend's required environment variables according to its configuration.

For local development, bind services to the loopback interface when possible and use development-only credentials.

Do not commit local environment files or real secrets to source control.

---

## Running the Application

### Start the backend

From the backend directory, run the FastAPI application using its actual Python module and application object.

For example, if the entry point is `main.py` and it exposes `app`:

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

If the application object is in another module, replace `main:app` with the correct import path.

When available, open the interactive API documentation at:

```text
http://127.0.0.1:8000/docs
```

### Start the frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

Vite will print the local development URL, commonly:

```text
http://localhost:5173
```

Open the URL printed by your terminal.

### Verify the integration

1. Confirm that the frontend loads.
2. Confirm that the backend starts without errors.
3. Check that the frontend can reach the backend.
4. Open the security dashboard.
5. Start the demo session or supported lab scenario.
6. Verify that events appear only when the corresponding backend pipeline produces them.
7. Check the browser console and backend logs if the dashboard remains empty.
8. Verify WebSocket connectivity if real-time updates are expected.

**Important:** The commands above assume conventional entry points. Check the actual `package.json`, backend entry point, and configuration before using them.

---

## Ethical Hacking Lab

SENTRA is designed to demonstrate session-security concepts through controlled scenarios against its own demonstration application.

Potential scenarios include:

| Scenario | Demonstration objective |
|---|---|
| Session hijacking simulation | Show suspicious reuse or context changes associated with a session |
| Device or location change | Demonstrate a change in available session context |
| Endpoint enumeration | Identify unusually broad or rapid endpoint exploration |
| Request burst | Detect an abnormal concentration of requests |
| Abnormal navigation | Identify deviations from expected navigation patterns |
| Failed-authentication burst | Detect repeated failed authentication attempts when such events are instrumented |
| Sensitive resource access | Demonstrate risk assessment around sensitive operations |
| Privilege escalation simulation | Demonstrate an unauthorized privilege-change attempt |
| Combined scenario | Evaluate several signals together |

Only scenarios actually implemented in the current build should be described as executable features.

The lab should use synthetic identities, test data, and local application endpoints. It should not collect real users' credentials or attempt to compromise external systems.

### Recommended demonstration sequence

1. Start the backend and frontend.
2. Establish a normal demo session.
3. Perform ordinary application navigation.
4. Confirm that expected telemetry is recorded.
5. Trigger a supported lab scenario.
6. Inspect the generated events and relevant indicators.
7. Review the drift and risk assessments.
8. Inspect the associated incident, if one is generated.
9. Verify the configured response.
10. Reset the demo state if the application supports resetting it.

This sequence helps demonstrate the relationship between session activity, detection, investigation, and response.

---

## Security Responses

SENTRA's intended response model can be organized into four levels.

| Level | Example response |
|---|---|
| Normal | Allow normal activity |
| Suspicious | Increase monitoring and record relevant evidence |
| Elevated | Request additional verification before sensitive operations |
| Critical | Restrict sensitive operations or invalidate the session when appropriate |

The exact response depends on the implemented policy and the evidence available.

A high anomaly score alone should not automatically be treated as proof of an attack. Security-critical authorization checks must be enforced independently of behavioral scores.

For example, a user must not gain access to an administrator-only resource merely because their risk score is low.

---

## Machine Learning Approach

SENTRA's proposed anomaly-detection component uses the Isolation Forest algorithm from Scikit-learn.

Isolation Forest is an unsupervised anomaly-detection method that attempts to identify observations that differ from the broader data distribution.

Potential input features include:

- Request frequency
- Request failure patterns
- Navigation behavior
- Session timing
- Access patterns for sensitive resources
- Other numerical or encoded signals supported by the implementation

### Role of machine learning

The model can contribute an anomaly signal to the security engine. It should not be treated as a standalone determination that a session is malicious.

The complete assessment may also depend on deterministic security rules and contextual evidence.

### Evaluation requirements

Reliable performance claims require appropriate test data and evaluation, including:

- Representative normal and suspicious sessions
- Clearly defined evaluation labels
- False-positive and false-negative analysis
- Appropriate validation procedures
- Documented model configuration
- Repeatable experiments

No accuracy or detection-rate claim should be made without supporting measurements.

---

## Security Considerations

SENTRA is a monitoring prototype, not a substitute for secure application development.

Recommended security practices include:

- Use HTTPS in deployed environments.
- Set appropriate `Secure`, `HttpOnly`, and `SameSite` attributes on authentication cookies.
- Rotate session identifiers after authentication and privilege changes.
- Apply authorization checks to every protected operation.
- Use short-lived credentials and suitable revocation mechanisms.
- Protect against cross-site scripting and cross-site request forgery.
- Validate and normalize incoming event data.
- Avoid logging passwords, raw session tokens, or unnecessary personal information.
- Restrict access to the security dashboard and incident information.
- Use least-privilege access controls.
- Limit request rates and protect sensitive endpoints.
- Keep dependencies updated and remove unused packages.
- Avoid exposing development servers or debugging endpoints publicly.

### Session state and persistence

The described prototype uses in-memory session state. This means state may disappear on restart, and state may not be shared between multiple backend instances.

A production system would require a carefully designed persistence and session-management strategy, appropriate access controls, retention rules, and reliable revocation behavior.

---

## Current Limitations

The project should be evaluated according to the functionality actually implemented and tested.

Known architectural limitations and prototype considerations include:

1. **Controlled environment:** Demonstrations are intended for the application's own test environment.
2. **Simulated attacks:** Lab scenarios demonstrate attack-like behavior and do not necessarily perform real credential theft.
3. **In-memory state:** Session information may be lost when the backend restarts.
4. **Context limitations:** Device and location signals are only as reliable as the data available to the application.
5. **False positives:** Legitimate behavior can appear anomalous.
6. **False negatives:** Some attacks may not produce detectable behavioral deviations.
7. **Model limitations:** Anomaly-detection quality depends on the features, baseline, and evaluation data.
8. **Score interpretation:** Drift and risk scores are indicators, not calibrated probabilities unless explicitly validated.
9. **Integration requirements:** Dashboard views and live updates depend on their backend APIs and event connections being implemented correctly.
10. **Production readiness:** The prototype is not represented as a fully hardened enterprise security platform.

These limitations provide opportunities for further development and evaluation.

---

## Future Enhancements

Possible improvements include:

- Persistent session and incident storage
- More robust session revocation and lifecycle management
- Improved baseline generation and adaptation
- Systematic false-positive and false-negative evaluation
- Better investigation timelines and event correlation
- Configurable and auditable response policies
- Stronger authentication and role-based access controls
- Improved event validation and data retention
- Expanded automated tests and integration tests
- Deployment hardening, monitoring, and operational documentation
- Evaluation against carefully designed, authorized security test scenarios

Future enhancements should be prioritized based on security requirements, measurable evaluation results, and the needs of the intended environment.

---

## Contributing

Contributions and suggestions are welcome.

A recommended contribution workflow is:

1. Fork the repository.
2. Create a separate feature branch.
3. Make a focused change.
4. Test the affected functionality.
5. Review changes for accidental secrets or sensitive data.
6. Submit a pull request describing the change and its test results.

Security-related contributions should include clear explanations of the issue, the expected behavior, and how the proposed change was tested.

---

## Disclaimer

SENTRA is an educational and defensive cybersecurity project.

All demonstrations should be performed against systems you own or are explicitly authorized to test. The ethical hacking lab is intended for controlled testing, not unauthorized access, credential theft, or disruption of external systems.

Behavioral anomalies do not independently establish malicious intent. The project's scores and responses must be interpreted according to the actual implementation and its evaluation.

The authors make no claim of production readiness or validated detection accuracy unless supported by documented testing.

---

## License

No license has been specified for this repository yet.

Before publishing the project for reuse, choose an appropriate license and add a corresponding `LICENSE` file. Until then, do not assume that others have permission to redistribute or modify the source code.

---

**SENTRA — Understand every session. Respond to every change.**