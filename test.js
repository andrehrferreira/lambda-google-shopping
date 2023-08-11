const func = require("./index");

(async () => {
    let response = await func.handler({ queryStringParameters: {
        url: "https://www.google.com.br/shopping/product/12025504090333292263?q=4550215018070&uule=w+CAIQICIJU2FvIFBhdWxv&prds=opd:10144645672768335720"
    }});
    
    console.log(response);
})();