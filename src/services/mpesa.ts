import config from "../config/env";
import axios, { AxiosInstance } from "axios";
import { delay } from "./utils";
import { randomUUID } from "crypto";

let cachedAccessToken: { accessToken: string, expiry: number } = { accessToken: '', expiry: 0 };

const getAccessToken = async () => {
    if (cachedAccessToken.accessToken && cachedAccessToken.expiry > Date.now()) {
        return cachedAccessToken.accessToken;
    }

    const auth = 'Basic ' + Buffer.from(config.MPESA_CONSUMER_KEY + ':' + config.MPESA_CONSUMER_SECRET).toString('base64');
    const { data } = await axios.get(`${config.MPESA_BASEURL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
            Authorization: auth,
        },
    });

    if (data && data.access_token && data.expires_in) {
        cachedAccessToken = { accessToken: data.access_token, expiry: Date.now() + data.expires_in * 1000 };
        return data.access_token;
    } else {
        throw new Error("Invalid token response format");
    }
};

const mpesaClient = async (): Promise<AxiosInstance> => {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error("Could not get access token");

    return axios.create({
        baseURL: config.MPESA_BASEURL,
        timeout: config.MPESA_REQUEST_TIMEOUT,
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
        },
    });
};

const mpesaExpressQuery = async (client: AxiosInstance, businessShortCode: string, password: string, timestamp: string, checkoutRequestId: string) => {
    const queryData = {
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
    };
    const { data } = await client.post("/mpesa/stkpushquery/v1/query", queryData);
    return data;
};

export const initiateB2C = async (amount: number, receiver: number) => {
    try {
        const client = await mpesaClient();
        const uuid = randomUUID();
        const shortcode = config.MPESA_B2C_SHORTCODE;
        const stkData = {
            "OriginatorConversationID": uuid,
            "InitiatorName": "testapi",
            "SecurityCredential": "luh8p8um43OKCjXKFHvv4R05ldWS6YCiVMIFdMAnKQx0d4UzUkDx/raXZFfGPXyUcDIlOygNyrPMEmk5KrE6lbWGGo6NItU6P1n06SqlAEWQgnrD2p632DMt1HNO25h12YUjmWjkemvPI92jg50XGPXzx9QgVYguNl7dTYXNt0sWgPNhAyPjcQQnP+D/cFZ6rlRg+VkHRBpsE9lIWV0xeWxFGvxv3N33ZwlTrAOShS4oKyDR5lAmWD68DSOpmJVagCQ+oL0iodvGogtOEhT8HJTpv2Us5Sft0ggRY4Pzc1o+YH8h47hj603913Ojz5p0HGF+nTzk2EqXQ77Qgt4HuA==",
            "CommandID": "BusinessPayment",
            "Amount": amount,
            "PartyA": shortcode,
            "PartyB": receiver,
            "Remarks": "remarks",
            "QueueTimeOutURL": config.MPESA_WEBHOOK_URL + "/api/mpesa/queue-webhook",
            "ResultURL": config.MPESA_WEBHOOK_URL + "/api/mpesa/b2c-webhook",
            "Occasion": "occasion",
        };
        const { data } = await client.post("/mpesa/b2c/v3/paymentrequest", stkData);
        return data;
    } catch (error: any) {
        console.error("Error in initiateB2C:", error.message);
        throw error; // Let controller handle the error
    }
};

export const initiateSTKPush = async (
    senderPhoneNumber: string,
    businessShortCode: string,
    amount: number,
    accountRef: string,
    user: string,
    transactionType = 'CustomerPayBillOnline',
    transactionDesc = 'Lipa na mpesa online'
) => {
    try {
        const client = await mpesaClient();

        const timeStamp = (new Date()).toISOString().replace(/[^0-9]/g, '').slice(0, -3);
        const password = Buffer.from(`${config.MPESA_SHORTCODE}${config.MPESA_PASSKEY}${timeStamp}`).toString('base64');

        const stkData = {
            BusinessShortCode: businessShortCode,
            Password: password,
            Timestamp: timeStamp,
            TransactionType: transactionType,
            Amount: amount,
            PartyA: senderPhoneNumber,
            PartyB: config.MPESA_SHORTCODE,
            PhoneNumber: senderPhoneNumber,
            CallBackURL: `${config.MPESA_WEBHOOK_URL}/api/mpesa/stk-webhook`,
            AccountReference: accountRef,
            TransactionDesc: transactionDesc,
        };
        console.log("STK Push short code:", stkData.BusinessShortCode);

        const { data } = await client.post("/mpesa/stkpush/v1/processrequest", stkData);
        console.log("STK Push response:", data);

        if (!data || data.ResponseCode !== "0") {
            throw new Error("Could not initiate STK Push");
        }

        await delay(10000); // Wait 10 seconds before querying
        let queryData = await mpesaExpressQuery(client, stkData.BusinessShortCode, password, timeStamp, data.CheckoutRequestID);
        console.log("STK Push query data:", queryData);
        return queryData;
    } catch (error: any) {
        console.error("Error initiating STK Push:", error.message);
        throw error; // Let controller handle the error
    }
};