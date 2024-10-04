import * as fs from "fs"
import { buildBaseURL, getResourceInfo, buildResultFileName } from "./utils.js";
import { generateAPIKey, resourceGetTreeLevel } from "./chili.js";

const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'))
const baseurl = buildBaseURL(config.environment, config.isSandbox);
const resultFileName = buildResultFileName(config.environment, config.resourceType, config.startingDirectory);

// Get API key
const apikeyFetch = await generateAPIKey(config.auth.user, config.auth.pass, config.environment, baseurl);
const apikey = apikeyFetch.isOK ? apikeyFetch.response : "FAILED";
if (apikey == "FAILED") {
    throw new Error(apikeyFetch.error);
}

// Get list of all resources within a given directory (recursive)
const initialTreeFetch = await resourceGetTreeLevel(config.resourceType, encodeURIComponent(config.startingDirectory), apikey, baseurl);
const initialTree = initialTreeFetch.isOK ? initialTreeFetch.response : "FAILED";
if (initialTree == "FAILED") {
    throw new Error(initialTreeFetch.error);
}
const resources = await getResourceInfo(initialTree, config.resourceType, [], apikey, baseurl)

// Find/create output directory
if (!fs.existsSync('./results')) {
    fs.mkdirSync('./results');
}
// Create CSV with headers column to write to, replace if report already exists
fs.writeFileSync(
    `./results/${resultFileName}`,
    'File Name, CHILI ID, Folderpath, File Size'
);
// Append results of each resource to file
resources.forEach(resource => {
    fs.appendFileSync(
        `./results/${resultFileName}`,
        `\n${resource.name}, ${resource.id}, ${resource.folderPath}, ${resource.fileSize}`
    );
});
