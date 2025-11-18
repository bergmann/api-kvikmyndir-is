"use strict";
const axios = require("axios");

const Service = {
    /**
     * Fetch content from a URL using Axios
     * @param {string} url - The URL to fetch data from
     * @returns {Promise<any>} - Resolves with the response data
     */
    getContent: function (url) {
        console.log(`[DEBUG] Attempting to fetch content from URL: ${url}`);
        const startTime = Date.now(); // Track request start time

        return axios
            .get(url, { timeout: 30000 }) // Set a 30-second timeout
            .then((response) => {
                const endTime = Date.now();
                console.log(`[DEBUG] Successfully fetched content from ${url}`);
                console.log(`[DEBUG] Response Status: ${response.status}`);
                console.log(`[DEBUG] Response Time: ${endTime - startTime} ms`);
                /*  console.log(
                    `[DEBUG] Response Data:`,
                    JSON.stringify(response.data, null, 2)
                ); */
                return response.data;
            })
            .catch((error) => {
                const endTime = Date.now();
                console.error(`[ERROR] Failed to fetch content from ${url}`);
                console.error(`[ERROR] Error Message: ${error.message}`);
                if (error.response) {
                    console.error(
                        `[ERROR] Response Status: ${error.response.status}`
                    );
                    console.error(
                        `[ERROR] Response Data:`,
                        JSON.stringify(error.response.data, null, 2)
                    );
                } else if (error.request) {
                    console.error(
                        `[ERROR] No response received. Request details:`,
                        error.request
                    );
                } else {
                    console.error(`[ERROR] Unexpected Error:`, error.message);
                }
                console.error(
                    `[DEBUG] Request Duration: ${endTime - startTime} ms`
                );
                throw error;
            });
    },

    /**
     * Fetch binary content from a URL using Axios
     * @param {string} url - The URL to fetch binary data from
     * @returns {Promise<Buffer>} - Resolves with the binary data
     */
    getContentBinary: function (url) {
        console.log(
            `[DEBUG] Attempting to fetch binary content from URL: ${url}`
        );
        const startTime = Date.now(); // Track request start time

        return axios
            .get(url, { responseType: "arraybuffer", timeout: 30000 })
            .then((response) => {
                const endTime = Date.now();
                console.log(
                    `[DEBUG] Successfully fetched binary content from ${url}`
                );
                console.log(`[DEBUG] Response Status: ${response.status}`);
                console.log(`[DEBUG] Response Time: ${endTime - startTime} ms`);
                return response.data;
            })
            .catch((error) => {
                const endTime = Date.now();
                console.error(
                    `[ERROR] Failed to fetch binary content from ${url}`
                );
                console.error(`[ERROR] Error Message: ${error.message}`);
                if (error.response) {
                    console.error(
                        `[ERROR] Response Status: ${error.response.status}`
                    );
                    console.error(
                        `[ERROR] Response Data:`,
                        JSON.stringify(error.response.data, null, 2)
                    );
                } else if (error.request) {
                    console.error(
                        `[ERROR] No response received. Request details:`,
                        error.request
                    );
                } else {
                    console.error(`[ERROR] Unexpected Error:`, error.message);
                }
                console.error(
                    `[DEBUG] Request Duration: ${endTime - startTime} ms`
                );
                throw error;
            });
    },
};

module.exports = Service;
