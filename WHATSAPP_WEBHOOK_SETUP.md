# WhatsApp Webhook Setup Guide

This guide explains how to configure the WhatsApp webhook in Meta Business Manager to receive incoming messages from users.

## Prerequisites

- Meta Business Account with WhatsApp Business API access
- Domain `copernigeo.com` configured and accessible
- Environment variable `WHATSAPP_WEBHOOK_VERIFY_TOKEN` set in your `.env.local`

## Step 1: Generate Webhook Verify Token

1. Generate a random secure token (you can use any random string generator):
   ```bash
   # Example: Generate a random token
   openssl rand -hex 32
   ```

2. Add it to your `.env.local`:
   ```env
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_generated_token_here
   ```

3. Keep this token secure - you'll need it in Step 3.

## Step 2: Deploy Your Application

Ensure your Next.js application is deployed and accessible at:
- `https://copernigeo.com/api/webhooks/whatsapp`

The webhook endpoint must be publicly accessible for Meta to verify and send messages.

## Step 3: Configure Webhook in Meta Business Manager

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Select your WhatsApp Business App
3. Navigate to **WhatsApp > Configuration** in the left sidebar
4. Scroll down to **Webhook** section
5. Click **Edit** or **Set up webhook**

### Webhook Configuration:

- **Callback URL**: `https://copernigeo.com/api/webhooks/whatsapp`
- **Verify Token**: Enter the same token you set in `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- **Webhook Fields**: Select the following:
  - ✅ `messages` - To receive incoming messages
  - ✅ `message_status` - To receive delivery status updates (optional but recommended)

6. Click **Verify and Save**

## Step 4: Subscribe to Webhook Events

After verifying the webhook:

1. In the same **Webhook** section, find your webhook
2. Click **Manage** next to your webhook
3. Under **Subscriptions**, ensure:
   - ✅ **Messages** is subscribed
   - ✅ **Message Status** is subscribed (optional)

## Step 5: Test Webhook Verification

Meta will automatically send a GET request to verify your webhook when you click "Verify and Save". 

The verification request will look like:
```
GET https://copernigeo.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE_STRING
```

Your endpoint should:
1. Check that `hub.mode === "subscribe"`
2. Verify that `hub.verify_token` matches your `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
3. Return `hub.challenge` as plain text with status 200

If verification succeeds, you'll see a green checkmark in Meta Business Manager.

## Step 6: Test Incoming Messages

1. Send a test message from your WhatsApp number to the business number
2. Type: `quiero ver el reporte`
3. Check your server logs to see if the webhook receives the message
4. Verify that the PDF and images are sent back via WhatsApp

## Troubleshooting

### Webhook Verification Fails

- **Check token**: Ensure `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in `.env.local` matches the token in Meta Business Manager
- **Check URL**: Ensure the webhook URL is publicly accessible and returns the challenge correctly
- **Check logs**: Review server logs for any errors during verification

### Messages Not Received

- **Check subscription**: Ensure "Messages" is subscribed in webhook settings
- **Check signature**: Verify webhook signature validation is working (check logs)
- **Check phone number**: Ensure the phone number format matches (no +, spaces, or special characters)
- **Check 24-hour window**: WhatsApp only allows responses within 24 hours of user's last message

### PDF/Images Not Sending

- **Check Firebase Storage**: Ensure PDF and images are uploaded and publicly accessible
- **Check URLs**: Verify URLs are HTTPS and accessible without authentication
- **Check logs**: Review WhatsApp API responses for any errors
- **Check rate limits**: WhatsApp has rate limits - add delays between multiple images

## Webhook Security

The webhook endpoint verifies requests using:
1. **Signature verification**: Uses `X-Hub-Signature-256` header with HMAC SHA256
2. **Verify token**: Validates the token during initial setup

Always keep your `WHATSAPP_WEBHOOK_VERIFY_TOKEN` secret and never commit it to version control.

## Quick Reply Button Setup

To add a quick reply button to your WhatsApp template:

1. Go to **Message Templates** in Meta Business Manager
2. Edit your template (e.g., "enviodereporte")
3. Add a **Quick Reply Button**:
   - Button text: "Ver reporte" or "Ver imágenes"
   - Button ID: `view_report` (or match what your code expects)
4. Submit for approval

The webhook will receive button clicks as `interactive` message type with `button_reply.id`.

## Testing Checklist

- [ ] Webhook verification succeeds
- [ ] Webhook shows as "Active" in Meta Business Manager
- [ ] Test message "quiero ver el reporte" is received
- [ ] PDF is sent successfully
- [ ] Images are sent successfully
- [ ] Quick reply button works (if implemented)
- [ ] Error handling works for missing reports

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Review Meta Business Manager webhook logs
3. Verify all environment variables are set correctly
4. Ensure your domain SSL certificate is valid

