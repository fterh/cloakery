# **Cloakery \- Technical Specification**

## **1\. Introduction**

**Cloakery** is an open-source, privacy-first email aliasing service that enables users to generate disposable email addresses that seamlessly forward to their primary inbox.
Furthermore, it allows users to reply to these forwarded emails while preserving their privacy; outbound replies automatically appear to originate from the generated alias rather than the user's real email address.

### **1.1 Core Features**

* **Disposable Aliases:** Generation of custom or randomized email aliases scoped to a user's unique username (e.g., alias@username.cloakery.io).  
* **Seamless Forwarding:** Routing of inbound emails to a user's registered email address.  
* **Privacy-Preserving Replies:** Dynamic generation of Reply-To headers utilizing an encoded sender format (`{alias}+{encoded_sender_email}@{username}.cloakery.io`).  
* **Ephemeral Processing:** Zero persistent storage of email content. All email payloads are processed in-memory.  
* **Resilient Delivery:** Failsafe mechanism that packages the original raw email as an attachment and delivers it to the user if inline processing encounters an error.  
* **Passkey Authentication:** Highly secure, passwordless authentication using WebAuthn.

## **2\. System Architecture**

The infrastructure is entirely AWS-native, utilizing serverless components to ensure zero-maintenance scaling, high availability, and low operational costs.

* **Frontend:** Amazon S3 \+ Amazon CloudFront (Static SPA hosting)  
* **Backend API:** Amazon API Gateway \+ AWS Lambda (RESTful endpoints)  
* **Relational Database:** Amazon RDS (PostgreSQL)
* **Key-Value Store:** Amazon DynamoDB (Ephemeral data and fast-access settings)
* **Inbound Email Pipeline:** Amazon SES Inbound Routing -> AWS Lambda
* **Outbound Email Pipeline:** AWS Lambda -> Amazon SES Outbound

## **3\. Data Model**

The primary relational data is housed in Amazon RDS (PostgreSQL), while transient and configuration data is managed in Amazon DynamoDB.

### **3.1 Relational Schema (Amazon RDS)**
**Table: users**

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | Unique identifier for the user. |
| username | VARCHAR(50) | UNIQUE, NOT NULL | Public handle used in the email sub-domain. |
| email | VARCHAR(255) | UNIQUE, NOT NULL | The user's actual  email address. |
| created\_at | TIMESTAMP | NOT NULL | System timestamp of account creation. |
| updated\_at | TIMESTAMP | NOT NULL | System timestamp of account update. |

**Table: passkeys**

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | VARCHAR | PRIMARY KEY | The WebAuthn credential ID. |
| user\_id | UUID | FOREIGN KEY, INDEX | Reference to users.id. |
| public\_key | BYTEA | NOT NULL | Stored public key for assertion. |
| counter | BIGINT | NOT NULL | Signature counter for replay attack prevention. |

**Table: aliases**

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | Unique identifier for the alias. |
| user\_id | UUID | FOREIGN KEY, NOT NULL | Reference to users.id. |
| alias | VARCHAR(255) | NOT NULL | The local-part prefix (e.g., shopping). |
| is\_active | BOOLEAN | DEFAULT TRUE | Toggle to pause/resume forwarding. |
| created\_at | TIMESTAMP | NOT NULL | System timestamp of alias creation. |

*Constraint Note: A composite UNIQUE(user\_id, alias) constraint enforces that a user cannot create duplicate aliases, though different users may share the same alias prefix (e.g., info@userA.cloakery.io and info@userB.cloakery.io).*

### **3.2 Ephemeral & Settings Schema (Amazon DynamoDB)**

**Table: CloakeryKV**

* **Partition Key:** pk (String). Formatted as USER\_SETTINGS\#\<uuid\> or AUTH\_CHALLENGE\#\<email\>.  
* **Attributes:** JSON document containing UI preferences, or WebAuthn cryptographic challenges (utilizing DynamoDB TTL for automatic expiration).

## **4\. Authentication & Security**

Cloakery relies exclusively on WebAuthn (Passkeys) via the @simplewebauthn library, omitting traditional passwords entirely.

### **4.1 Registration Flow**

1. **Initiate:** User submits a desired username and their email address via the client.  
2. **Challenge:** Lambda backend generates a WebAuthn registration challenge and caches it in DynamoDB with a 5-minute TTL.  
3. **Prompt:** Client-side application invokes the browser's WebAuthn API (FaceID, TouchID, YubiKey, etc.).  
4. **Verify & Persist:** Lambda cryptographically verifies the signature, provisions the user record in RDS, and stores the public key.
5. **Session:** A JSON Web Token (JWT) is issued and set as an HttpOnly, Secure cookie.

### **4.2 Login Flow**

1. **Initiate:** User submits their username or utilizes Passkey Autofill.  
2. **Challenge:** Backend retrieves associated credential IDs, generates an assertion challenge, and caches it in DynamoDB.  
3. **Prompt & Verify:** Client signs the challenge; Lambda verifies the signature against the stored public\_key and increments the replay counter.  
4. **Session:** A fresh JWT session cookie is issued.

## **5\. Core Email Workflows**

### **5.1 Inbound Routing (Receiving)**

1. **Trigger:** External sender transmits an email to `alias@username.cloakery.io`. 
2. **Ingestion:** SES Inbound Rule triggers the Inbound Lambda Processor.  
3. **Validation:** Lambda queries RDS to ensure the alias exists, belongs to the specified username, and is\_active \== TRUE.
4. **Transformation:**  
   * Sender's email address is encoded.  
   * The Reply-To header is mutated to: `{alias}+{encoded_sender_email}@{username}.cloakery.io`.  
     * Ensure that the username (before `@`) does not exceed 64 characters (see [RFC 3696](https://datatracker.ietf.org/doc/html/rfc3696)).
   * The From header is updated to reflect the Cloakery routing.  
5. **Dispatch:** Lambda forwards the modified email to the user's real\_email via SES.  
6. **Error Handling:** If parsing or transformation fails, a try-catch block catches the exception. The Lambda function takes the raw inbound .eml payload, attaches it to a new diagnostic email, and sends it directly to the user's real\_email to prevent data loss.
   * This assumes the email does not exceed Lambda's 30MB payload limit.

### **5.2 Outbound Routing (Replying)**

1. **Trigger:** User replies to a forwarded email. The message is sent to `{alias}+{encoded_sender_email}@{username}.cloakery.io`.  
2. **Ingestion:** SES Inbound Rule triggers the Outbound Lambda Processor.  
3. **Extraction & Validation:**  
   * Lambda extracts the alias and encoded\_sender\_email from the recipient address.  
   * Validates that the sender (the user's real email) owns the alias.  
4. **Transformation:**  
   * Decodes the original external sender's email.  
   * Strips internal Cloakery forwarding headers and metadata from the payload.  
   * Mutates the From header to be `alias@username.cloakery.io`. 
5. **Dispatch:** Lambda utilizes SES Outbound to deliver the reply to the external recipient.

## **6\. Implementation Phases**

1. **Phase 1: Infrastructure Foundations**  
   * Configure AWS services (API Gateway, SES, Lambda, CloudFront).  
   * Configure SES domain identity and MX records for cloakery.io.  
2. **Phase 2: CI/CD Pipeline Setup**  
   * Setup GitHub Actions workflows.  
   * Integrate Biome for linting/formatting and define deploy steps.  
   * Establish OIDC trust between GitHub and AWS.  
3. **Phase 3: Passkey Authentication Logic**  
   * Implement Registration/Login endpoints and JWT cookie management.  
4. **Phase 4: Dashboard & Alias Management**
   * Build S3/CloudFront SPA frontend and RDS CRUD APIs.
5. **Phase 5: Inbound Email Pipeline**  
   * Develop Lambda encoding logic, SES forwarding, and fallback attachment error-handling.  
6. **Phase 6: Outbound Email Pipeline**  
   * Develop Lambda decoding logic, header stripping, and secure outbound SES routing.

## **7\. Development & Operations**

### **7.1 Tooling**

* **Language:** TypeScript (Strict Mode) across frontend and backend.  
* **Linter & Formatter:** **Biome** for instantaneous code quality checks.  
* **Infrastructure as Code:** Serverless framework.

### **7.2 CI/CD Pipeline (GitHub Actions)**

* **PR Checks:** Execution of biome check, tsc \--noEmit, and automated test suites.  
* **Backend Deployment:** Automated deploy on merge to main, authenticated securely via GitHub OIDC.  
* **Frontend Deployment:** Automated build, S3 sync, and CloudFront cache invalidation.
