# UGSouq WhatsApp replies

When someone messages the UGSouq number in WhatsApp, the assistant can show a welcome menu and respond to requests about shopping, tracking, returns, selling and seller verification. The support option gives the existing Help Centre and support email. Customers can open protected UGSouq tools from the links.

## WhatsApp Business greeting on Android

For an immediate welcome message, open **WhatsApp Business → Tools → Greeting message**. Turn it on, set **Recipients → Everyone**, paste the message, and save. WhatsApp sends it to first-time contacts and after 14 days of inactivity.

> Oli otya! 👋 Thanks for messaging UGSouq. Tell us how we can help with shopping, delivery, returns, or selling. You can also find help at https://www.ugsouq.com/support. Please keep passwords, PINs, verification codes and ID documents out of this chat.

See the [WhatsApp greeting message guide](https://faq.whatsapp.com/501866148528310/).

## Test the interactive replies

1. In the [Meta App Dashboard](https://developers.facebook.com/apps), create or select the UGSouq app with the WhatsApp use case. Start with Meta’s test number and add your own WhatsApp number as the test recipient. Use a staging deployment and its test database.
2. In the deployment’s server environment, set `WHATSAPP_REPLIES_ENABLED=true`, `WHATSAPP_PHONE_NUMBER_ID` to Meta’s numeric ID for the test number, and `WHATSAPP_GRAPH_API_VERSION` to the version shown in the app’s API Setup.
3. Set `WHATSAPP_APP_SECRET` to the Meta app secret and `WHATSAPP_ACCESS_TOKEN` to the WhatsApp Cloud API token. Set `WHATSAPP_VERIFY_TOKEN` to a separate random value (for example, generate it with `openssl rand -hex 32`). Enter secrets directly in the deployment and Meta dashboards.
4. Restart the staging deployment. It creates the `whatsapp_replies` table when configured. In Meta’s WhatsApp configuration, set the callback to `https://<staging-host>/api/whatsapp/webhook`, enter the same verify token, and subscribe to the `messages` field for the test WhatsApp account.
5. From your test recipient’s WhatsApp, message the test number with `Hi`, `2`, `refund`, `blue tick` and `human`. Check that replies arrive in the same WhatsApp chat and that they link to the intended UGSouq pages. Repeat one option to confirm a new inbound message can get a new reply.

The [Meta Cloud API setup guide](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started) covers app setup and test recipients. The [webhook guide](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview) covers subscriptions.

## Use the UGSouq number

Confirm Meta’s supported onboarding path for an existing WhatsApp Business app number before making account changes. If keeping the active Android inbox is required, verify that Meta or the provider offers [coexistence for this account](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users) and test messaging in both directions. Use the supported onboarding flow and a production token. If the automated greeting is active when the interactive replies go live, turn off the greeting to avoid two welcomes. Set `WHATSAPP_REPLIES_ENABLED=false` and restart to pause the interactive replies.

The endpoint verifies signed Meta events and processes recent direct customer messages for its configured Meta phone number ID. It sends fixed replies during the customer service window. The application stores only hashes of processed message IDs and processing times, pruning records older than two days on startup and during message handling. The bot skips message history, status events and media contents. Outbound calls that time out or return a server error may have reached Meta already. In those cases the bot avoids resending and leaves the conversation for manual follow-up.
