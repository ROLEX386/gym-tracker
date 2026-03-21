# Gym Management Pro - License Auth System

A complete software license authorization and download system.

## Setup Instructions

1. **Install dependencies**
   Run the following command in the `license-auth` directory:
   ```bash
   npm install
   ```

2. **Environment Variables**
   The `.env` file is already created with template values. Update the SMTP details if you want emails to work. 
   The default admin username is `admin`. The password hash in `.env` corresponds to the password `admin`.
   
   *To generate a new bcrypt hash for a different password:*
   ```bash
   node -e "console.log(require('bcryptjs').hashSync('your_new_password', 10))"
   ```
   Copy the output and paste it into `.env` under `ADMIN_PASSWORD_HASH`.

3. **Link to Software Installer**
   Ensure that the actual software installer is located at `../gym-software/dist/GymManagementSetup.exe` relative to this `license-auth` folder, as defined in `config/config.json`.

4. **Start the Servers**
   ```bash
   npm start
   ```
   This will boot three services on `localhost`:
   - Backend API (`http://localhost:3000`)
   - Client App (`http://localhost:3001`)
   - Admin Dashboard (`http://localhost:3002`)

5. **Using the Client and Admin Dashboards**
   Simply open the hosts in any modern browser:
   - **Client App**: Open `http://localhost:3001`
   - **Admin Dashboard**: Open `http://localhost:3002`
