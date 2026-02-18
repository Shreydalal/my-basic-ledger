
export const WEBHOOK_URL = "https://n8n-1-jr1m.onrender.com/webhook-test/entry";

export async function triggerWebhook(data: any) {
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            console.error("Webhook failed:", response.statusText);
        } else {
            console.log("Webhook triggered successfully");
        }
    } catch (error) {
        console.error("Error triggering webhook:", error);
    }
}
