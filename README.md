# VitaVibe Server - Heart❤️ of VitaVibe store. 

![Снимок экрана от 2023-11-24 16-36-16(1)](https://github.com/LezyHown/VitaVibe-Server/assets/116440916/3afabed4-6379-45d5-86cb-e2da1e8449a2)

## Environment variables (.env)

The application requires some environment variables to function properly, which must be defined in the `.env` file.

### Example of an .env file:
```env
# -----------------------------------------
# API Config Connection
# ------------------------------------------
CLIENT_URL=http://localhost:3000
API_URL=http://localhost:8000
BRAND="Vitavibe"
PORT=8000

SUBSCRIPTION_PERCENT_DISCOUNT=15

# -----------------------------------------
# Encrypt-Decrypt data
# ------------------------------------------
PARAMS_SALT=RANDOM_GENSTRING

# -----------------------------------------
# Mongodb
# ------------------------------------------
MONGODB_DATABASE_NAME="VitaVibe"
MONGODB_CONNECTION_STRING="mongodb+srv://CONNECTION_PATH_WITH_PASSWORD/"

# -----------------------------------------
# JWT Secrets for genaration
# ------------------------------------------
JWT_ACCESS_SECRET=SECRET_ACCESS_GENERATION
JWT_REFRESH_SECRET=SECRET_REFRESH_GENERATION

# -----------------------------------------
# SMTP Gmail AuthData (2-Step Verification REQUIRED)
# ------------------------------------------
SMTP_HOST="smtp.gmail.com"
SMTP_EMAIL=YOUR_GMAIL
SMTP_PASSWORD=GMAIL_APPS_PASSWORD
AUTO_SENDMAIL_DELAY=1000

# ----------------------------------
# PAYMENT
# ----------------------------------
STRIPE_SECRET=YOUR_STRIPE_SECRET

# ----------------------------------
# SHIPPING
# ----------------------------------
SHIPPING_COURIER_USD=10
SHIPPING_POST_USD=8
# REACT_APP_FREE_SHIPPING_THRESHOLD_USD sets the threshold price (in USD) for free shipping.
# Orders with a total equal to or above this threshold will qualify for free shipping.
FREE_SHIPPING_THRESHOLD_USD=33
```

## Main Technologies

- **Express**: 🚀 Fast and minimalistic web framework for Node.js

- **Typescript**: 📝 Adds static typing, making code more readable and scalable
- **MongoDB**: 📂 NoSQL database for efficient storage and retrieval of data in a flexible, JSON-like format
- **Node.js**: 🛠️ Server Runtime
- **Stripe**: 💳 Online payment processing platform for accepting secure payments
- **Joi**: 🏹 Object schema description language and validator for JavaScript objects, ensuring data integrity
- **JWT (JSON Web Token)**: 🔐 Compact and self-contained way to securely transmit information between parties as a JSON object
- **Speakeasy**: 🔐 Library for two-factor authentication, adding an extra layer of security to user accounts
- **Security (Bcrypt & Crypto)**: 🔐 Libraries for hashing passwords (Bcrypt) and cryptographic functionality (Crypto), enhancing the overall security of app.


## Project structure
- **`config`**: 🛠️ Configuration files for project settings. Customize to fit your needs.

- **`middlewares`**: ⚙️ Custom middleware functions for request-response tasks. Apply to routes for added functionality.

- **`mongodb`**: 📂 Database-related files. Includes connection setup, models, and tasks.

- **`routes`**: 🛣️ Define application routes. Each handles specific HTTP requests, interacting with controllers.

- **`services`**: 🚀 Business logic and services for controllers. Core functionality resides here.

- **`controllers`**: 🎮 Handle incoming requests, process data with services, and send responses. The bridge between routes and services.
