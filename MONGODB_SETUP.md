# MongoDB Atlas Connection Fix

## Error: "Could not connect to any servers in your MongoDB Atlas cluster"

This error occurs when your IP address is not whitelisted in MongoDB Atlas.

## Solution Steps:

### 1. Go to MongoDB Atlas Console
- Visit: https://cloud.mongodb.com/
- Login to your account
- Select your cluster

### 2. Configure IP Whitelist
- Click **Network Access** in the left sidebar
- Click **Add IP Address**

### Option A: For Development (Allow All - Not Recommended for Production)
- Click **ALLOW ACCESS FROM ANYWHERE**
- Enter `0.0.0.0/0`
- Click **Confirm**

### Option B: For Production (Add Specific IPs)
- If deploying on **Vercel**: Add Vercel's IP ranges
  - Vercel publishes their IP ranges: https://vercel.com/docs/concepts/edge-network/regions#ip-addresses
  
- If deploying on **Heroku**: Add Heroku's IP ranges
  
- For **Local Development**: Add your current IP address
  - Find your IP: https://whatismyipaddress.com/
  
### 3. Verify Environment Variables
Make sure your `.env` file contains:
```
MONGO_URI=mongodb+srv://username:password@cluster-name.mongodb.net/database-name?retryWrites=true&w=majority
```

### 4. Test Connection
Run the server and check the logs:
```bash
npm start
```

Look for: `✅ Securely connected to MongoDB!`

### 5. Verify with Health Check
Once the server is running, visit:
```
http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-05-30T...",
  "message": "All systems operational"
}
```

## Troubleshooting

### Still getting connection errors?
1. **Check MONGO_URI**: Ensure it's exactly correct in `.env`
2. **Verify credentials**: Username and password must match MongoDB user
3. **Check database name**: Database must exist in your cluster
4. **Network issues**: Try pinging `nslookup` on the cluster hostname
5. **Firewall**: If on corporate network, check if MongoDB Atlas is blocked

### Error: "Authentication failed"
- Username/password in MONGO_URI is incorrect
- Special characters in password need URL encoding
- User doesn't have permission for that database

### Connection times out
- IP is still not whitelisted
- MongoDB Atlas cluster is paused (resume it)
- Network connectivity issue (check your internet)

## Security Best Practices

**NEVER** commit `.env` to GitHub!

For **production**:
- Use specific IPs (Vercel, AWS, etc.)
- Use database user with minimal permissions
- Change default passwords
- Enable IP whitelist

For **development**:
- Can use `0.0.0.0/0` for convenience
- Keep sensitive `.env` values local only
