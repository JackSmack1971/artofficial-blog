# **Technical Documentation: ARTOfficial Intelligence Academy**

This document provides a set of technical specifications for the development, integration, and deployment of the ARTOfficial Intelligence Academy platform.

## **1. API Specification Document**

This document outlines the specifications for integrating with the primary external services required for the ARTOfficial Intelligence Academy: **Ghost Pro** and **ConvertKit**.

### **1.1. General Principles**

  * **Authentication**: All private API requests must be authenticated. The Ghost Admin API uses a JSON Web Token (JWT), while the Ghost Content API and ConvertKit API use static keys.
  * **Error Handling**: The application should implement a robust error handling strategy, including:
      * **Retry Logic**: Use an exponential backoff strategy for transient network errors.
      * **Circuit Breaker**: Implement a circuit breaker pattern to prevent cascading failures when an external API is down.
      * **Fallbacks**: Serve cached content from the last successful fetch if a live API call fails.
  * **Data Format**: All API requests and responses will use the `application/json` format.

-----

### **1.2. Ghost Pro API**

The platform interacts with two Ghost APIs: the **Content API** for fetching public data and the **Admin API** for protected actions like member management.

#### **1.2.1. Authentication**

  * **Content API**: Authenticated using a **Content API Key** passed as a URL query parameter.

      * `key`: `process.env.GHOST_CONTENT_API_KEY`

  * **Admin API**: Authenticated using a JWT generated from an **Admin API Key ID & Secret**. The token has a short lifespan (5 minutes) and must be generated for each request or series of requests.

    ```typescript
    // JWT Generation for Ghost Admin API
    import jwt from 'jsonwebtoken';

    function generateGhostJWT() {
      const keyId = process.env.GHOST_ADMIN_API_KEY_ID;
      const secret = process.env.GHOST_ADMIN_API_KEY_SECRET;
      const payload = {
        exp: Math.floor(Date.now() / 1000) + (5 * 60),
        iat: Math.floor(Date.now() / 1000),
        aud: '/admin/'
      };
      const header = { alg: 'HS256', typ: 'JWT', kid: keyId };
      return jwt.sign(payload, Buffer.from(secret, 'hex'), { header });
    }
    ```

#### **1.2.2. Endpoints**

**A. Content API Endpoints (Public)**

  * **`GET /ghost/api/v5/content/posts/`**

      * **Description**: Retrieves a paginated list of published posts.
      * **Query Parameters**: `key`, `limit`, `page`, `filter`, `include` (e.g., `authors,tags`).
      * **Success Response (200 OK)**:
        ```json
        {
          "posts": [
            {
              "id": "60d...c1",
              "slug": "welcome-to-the-academy",
              "title": "Welcome to the Academy",
              "html": "<p>Content here...</p>",
              "feature_image": "url/to/image.jpg",
              "published_at": "2025-08-01T12:00:00.000Z",
              "authors": [{ "id": "...", "name": "Admin" }]
            }
          ],
          "meta": { "pagination": { ... } }
        }
        ```

  * **`GET /ghost/api/v5/content/posts/slug/{slug}`**

      * **Description**: Retrieves a single post by its slug.
      * **Success Response (200 OK)**: A single post object as shown above.

**B. Admin API Endpoints (Private)**

  * **`POST /ghost/api/admin/members/`**
      * **Description**: Creates a new member (subscriber) or updates an existing one if the email is already present. Used for the newsletter signup form.
      * **Authentication**: `Authorization: Ghost {JWT}`
      * **Request Body**:
        ```json
        {
          "email": "sarah.strategist@example.com",
          "subscribed": true,
          "labels": ["strategist"],
          "note": "Subscribed from homepage form"
        }
        ```
      * **Success Response (201 Created)**: A member object.

#### **1.2.3. Webhooks**

  * **Description**: Ghost Pro will be configured to send a POST request to a Vercel serverless function (`/api/webhooks/ghost`) to trigger content revalidation upon changes.
  * **Events**: `post.published`, `post.updated`, `post.deleted`.

-----

### **1.3. ConvertKit API (Alternative)**

Used for advanced newsletter automation if Ghost Native capabilities are outgrown.

#### **1.3.1. Authentication**

  * Authenticated using a secret API key passed in the request body.
      * `api_key`: `process.env.CONVERTKIT_API_KEY`

#### **1.3.2. Endpoints**

  * **`POST /v3/forms/{formId}/subscribe`**
      * **Description**: Subscribes a new user to a specific form.
      * **Request Body**:
        ```json
        {
          "api_key": "your_api_key",
          "email": "marcus.engineer@example.com",
          "tags": ["technical_deep_dive", "user_from_website"]
        }
        ```
      * **Success Response (200 OK)**:
        ```json
        {
          "subscription": {
            "id": 123456,
            "state": "inactive",
            "subscriber": { "id": 78910 }
          }
        }
        ```

-----

## **2. Database Design Document**

The primary content and member database for the ARTOfficial Intelligence Academy is managed by the **Ghost Pro** service. This document outlines the logical schemas of the core data entities as they are consumed and interacted with by the Next.js application.

### **2.1. Conceptual Data Model**

The data model is centered around **Posts** (Articles), which are created by **Authors** (Users) and organized by **Tags**. **Subscribers** are managed separately through the newsletter service but are logically linked to the platform's user base.

**Key Relationships:**

  * **One-to-Many**: An `Author` can write many `Posts`.
  * **Many-to-Many**: A `Post` can have many `Tags`, and a `Tag` can be applied to many `Posts`.
  * **Many-to-Many**: A `Post` can be written by one or more `Authors`.

### **2.2. Data Schemas**

#### **Posts / Articles**

This entity stores all blog content. It corresponds to the `posts` table in Ghost.

| Field Name | Data Type | Description & Constraints |
| :--- | :--- | :--- |
| **`id`** | `VARCHAR(24)` | **Primary Key.** Unique identifier for the post. |
| `uuid` | `VARCHAR(36)` | A universally unique identifier. |
| `title` | `VARCHAR(2000)` | The title of the article. **Required.** |
| `slug` | `VARCHAR(191)` | URL-friendly version of the title. **Unique.** |
| `html` | `LONGTEXT` | The full rendered HTML content of the article. |
| `feature_image` | `VARCHAR(2000)` | URL for the article's main image. |
| `status` | `VARCHAR(50)` | Publication status ('draft', 'published', 'scheduled'). Defaults to 'draft'. |
| `published_at` | `DATETIME` | The date and time the article was published. |
| `created_at` | `DATETIME` | The date and time the article was created. **Required.** |
| `updated_at` | `DATETIME` | The date and time the article was last updated. |
| `author_id` | `VARCHAR(24)` | **Foreign Key** to the `users` table. |
| `reading_time` | `INT` | Estimated reading time in minutes. |
| `meta_title`| `VARCHAR(300)`| Custom title for SEO purposes. |
| `meta_description` | `VARCHAR(500)`| Custom description for SEO purposes. |

#### **Authors**

This entity stores information about content creators. It corresponds to the `users` table in Ghost.

| Field Name | Data Type | Description & Constraints |
| :--- | :--- | :--- |
| **`id`** | `VARCHAR(24)` | **Primary Key.** Unique identifier for the author. |
| `name` | `VARCHAR(191)` | The author's full name. **Required.** |
| `slug` | `VARCHAR(191)` | URL-friendly version of the name. **Unique.** |
| `email` | `VARCHAR(191)` | The author's email address. **Unique, Required.** |
| `profile_image`| `VARCHAR(2000)` | URL for the author's avatar. |
| `bio` | `TEXT` | A short biography of the author. |
| `website` | `VARCHAR(2000)` | The author's personal or professional website. |
| `twitter` | `VARCHAR(2000)` | The author's Twitter profile URL. |
| `facebook`| `VARCHAR(2000)` | The author's Facebook profile URL. |

#### **Subscribers**

This entity represents users subscribed to the newsletter. The data is managed by the newsletter service (Ghost or ConvertKit).

| Field Name | Data Type | Description & Constraints |
| :--- | :--- | :--- |
| **`id`** | `UUID` | **Primary Key.** Unique identifier for the subscriber. |
| `email` | `String` | The subscriber's email address. **Unique, Required.** |
| `subscription_date`| `DateTime` | When the user subscribed. |
| `subscription_source`|`String` | Where the user subscribed from (e.g., 'homepage\_header'). |
| `preferences` | `Object` | User-defined preferences (e.g., `{'content_types': ['technical']}`). |
| `engagement_score`| `Float` | A score indicating the subscriber's level of interaction. |
| `is_active` | `Boolean` | Current subscription status. |

### **2.3. Data Management and Security**

  * **Persistence**: All primary data is stored and managed within the Ghost Pro cloud infrastructure. The Next.js application is stateless.
  * **Backups**: Ghost Pro performs daily automated backups of all content and member data.
  * **Security**: Data is encrypted in transit (TLS 1.3) and at rest (AES-256). The application adheres to the principle of data minimization, only collecting essential subscriber information.

-----

## **3. Deployment Guide**

This guide provides instructions for setting up the infrastructure and deploying the ARTOfficial Intelligence Academy platform.

### **3.1. System Architecture Overview**

The platform uses a **JAMstack architecture**:

  * **Frontend**: Next.js 15, deployed on Vercel.
  * **Backend (Headless CMS)**: Ghost Pro.
  * **Hosting & CDN**: Vercel.
  * **CI/CD**: GitHub Actions.

### **3.2. Prerequisites**

  * **Vercel Account**: Pro Plan is required for team collaboration features.
  * **Ghost Pro Account**: Creator Plan is sufficient to start.
  * **GitHub Repository**: A repository to host the Next.js application code.
  * **Domain Name**: A registered domain (e.g., `artofficialintelligence.academy`).
  * **Local Environment**: Node.js v18+ and `npm` or `yarn`.

### **3.3. Configuration & Setup**

#### **Step 1: Ghost Pro Configuration**

1.  Set up your Ghost Pro instance.
2.  Navigate to **Settings → Integrations**.
3.  Add a new custom integration named "Next.js Frontend".
4.  Copy the following keys:
      * **Content API Key**: Used for fetching public content.
      * **Admin API Key**: Used for subscribing members.
      * **API URL**: The URL of your Ghost instance.
5.  Navigate to **Settings → Integrations → Webhooks**.
6.  Create a new webhook for the `post.published` event.
7.  Set the **Target URL** to the endpoint you will create in Vercel (e.g., `https://[your-domain]/api/revalidate`).

#### **Step 2: Vercel Project Setup**

1.  Connect your GitHub repository to a new Vercel project.
2.  In the project settings, navigate to **Environment Variables**.
3.  Add the following variables obtained from Ghost Pro and other services:
    ```
    GHOST_API_URL=<Your Ghost API URL>
    GHOST_CONTENT_API_KEY=<Your Ghost Content API Key>
    GHOST_ADMIN_API_KEY=<Your Ghost Admin API Key>

    # Optional for advanced newsletter features
    CONVERTKIT_API_KEY=<Your ConvertKit API Key>

    # For analytics
    NEXT_PUBLIC_GA_ID=<Your Google Analytics 4 Measurement ID>

    # For error tracking
    SENTRY_DSN=<Your Sentry DSN>
    ```
4.  Navigate to the **Domains** tab and add your custom domain. Follow the instructions to configure your DNS records. Vercel will automatically provision and renew the SSL certificate.

### **3.4. Deployment Process**

The project uses a CI/CD pipeline managed by GitHub Actions for automated testing and deployment.

#### **CI/CD Pipeline Workflow**

A workflow is configured in `.github/workflows/deploy.yml`. When a pull request is created, the following jobs run automatically:

1.  **Lint & Format**: Code is checked against ESLint and Prettier rules.
2.  **Unit & Integration Tests**: `jest` is run to verify all components and services.
3.  **Security Scan**: `Snyk` or `Dependabot` scans for vulnerabilities in dependencies.
4.  **Build**: The Next.js application is built to ensure it compiles.
5.  **E2E Tests**: `Cypress` runs against the Vercel Preview Deployment to test user flows.
6.  **Performance Check**: `Lighthouse CI` runs against the preview URL to check for performance regressions.

#### **Deployment Triggers**

  * **Preview Deployment**: A unique, shareable deployment is created for every pull request and commit pushed to a branch. This is used for User Acceptance Testing (UAT).
  * **Production Deployment**: Merging a pull request into the `main` branch automatically triggers a deployment to the production environment.

### **3.5. Infrastructure Security**

  * **Security Headers**: Essential security headers are automatically added to all responses via the `next.config.js` file to mitigate common web vulnerabilities.
    ```javascript
    // next.config.js
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }
    ]
    ```
  * **Rate Limiting**: API routes (e.g., `/api/newsletter/subscribe`) should be protected with a rate-limiting middleware to prevent abuse.
  * **Environment Variables**: All secret keys and credentials are stored securely as environment variables in Vercel, never hard-coded in the source.