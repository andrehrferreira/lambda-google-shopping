const chromium = require("chrome-aws-lambda");
const { addExtra } = require("puppeteer-extra");
const puppeteerExtra = addExtra(chromium.puppeteer);
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cheerio = require("cheerio");

function decodeHTMLEntities(str){
    if(typeof str == "string"){
        return str.replace(/&#(\d+);/g, (match, dec) => {
            return String.fromCharCode(dec);
        }).replace("&#xA0;", " ");
    }
    else{
        return str;
    }
}

exports.handler = async (event) => {
    try {
        const agents = require("./agents");
        let url = event.url || event.queryStringParameters.url;
        
        if(url){
            url = decodeURIComponent(url);

            puppeteerExtra.use(StealthPlugin());

            const browser = await puppeteerExtra.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath,
                headless: chromium.headless,
            });

            const page = await browser.newPage();
            await page.setRequestInterception(true);

            page.on("request", request => {
                if (request.resourceType() === "script"){
                    request.abort();
                }                    
                else{
                    if (!request.isNavigationRequest()) {
                        request.continue();
                        return;
                    }
    
                    const headers = request.headers();
                    headers["User-Agent"] = agents[Math.floor(Math.random() * agents.length)];
                    request.continue({ headers });
                }                
            });

            await page.goto(url);
            const html = await page.content();
            const $ = cheerio.load(html);

            let data = {
                product: {
                    name: decodeHTMLEntities($("#product-name").html()),
                    brand: decodeHTMLEntities($("#product-brand").html()),
                    image: $("#alt-image-cont img").attr("src")
                },
                sellers: []
            };

            $("#os-sellers-table .os-row").each((index, item) => {
                data.sellers.push({
                    position: index+1,
                    name: $(".os-seller-name-primary a", item).html(),
                    price: decodeHTMLEntities($(".os-price-col span", item).html()),
                });                
            });

            await page.close();
            await browser.close();

            return {
                statusCode: 200,
                body: JSON.stringify({ data })
            };
        }
        else{
            return {
                statusCode: 400,
                body: "Invalid url"
            };
        }
    } catch (e) {
        console.log(e);
        
        return {
            statusCode: 400,
            body: JSON.stringify(e)
        };
    }
};