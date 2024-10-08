import { XMLParser } from "fast-xml-parser";
import { resourceGetTreeLevel } from "./chili.js";

// parse CHILI API XML responses to JSON
export function jsonifyChiliResponse(response) {
    const fastXmlParser = new XMLParser({
        ignoreAttributes: false,
        attrNodeName: false,
        attributeNamePrefix: "",
    });

    let data = fastXmlParser.parse(response);
    const firstKeys = Object.keys(data);
    if (firstKeys.length == 1) {
        if (typeof data[firstKeys[0]] == "object") {
            data = data[firstKeys[0]];
        }
    }
    return data;
}

// Recursively search tree, return found document IDs
export async function getResourceInfo(tree, type, resources, apikey, baseurl) {
    // Check if directory is empty
    if (tree.item != null) {
        // Check if multiple items in directory
        if (tree.item.length != null) {
            for (let i = 0; i < tree.item.length; i++) {
                if (tree.item[i].isFolder != "true") {
                    resources.push({
                        "id": tree.item[i].id,
                        "name": tree.item[i].name.replaceAll(",", "."),
                        "folderPath": (tree.item[i].path.replace(`\\${tree.item[i].name}`, "")).replaceAll(",", "."),
                        "fileSize": tree.item[i].fileInfo.fileSize,
                        "fileSize_bytes": parseToBytes(tree.item[i].fileInfo.fileSize)
                    });
                }
                else {
                    // Search next tree down
                    let newTree = await resourceGetTreeLevel(type, encodeURIComponent(tree.item[i].path), apikey, baseurl)
                    let newTreeResult = newTree.isOK ? newTree.response : "FAILED";
                    if (newTreeResult != "FAILED") {
                        resources.concat(await getResourceInfo(newTreeResult, type, resources, apikey, baseurl));
                    }
                    else {
                        throw new Error(newTree.error);
                    }
                }
            }
        }
        // Handles edge case of there only being one item in a directory
        else {
            if (tree.item.isFolder != "true") {
                resources.push({
                    "id": tree.item.id,
                    "name": tree.item.name.replaceAll(",", "."),
                    "folderPath": (tree.item.path.replace(`\\${tree.item.name}`, "")).replaceAll(",", "."),
                    "fileSize": tree.item.fileInfo.fileSize,
                    "fileSize_bytes": parseToBytes(tree.item.fileInfo.fileSize)
                });
            }
            else {
                // Search next tree down
                let newTree = await resourceGetTreeLevel(type, encodeURIComponent(tree.item.path), apikey, baseurl)
                let newTreeResult = newTree.isOK ? newTree.response : "FAILED";
                if (newTreeResult != "FAILED") {
                    resources.concat(await getResourceInfo(newTreeResult, type, resources, apikey, baseurl));
                }
                else {
                    throw new Error(newTree.error);
                }
            }
        }
    }
    return resources;
}

// Build base url for API
export function buildBaseURL(environment, isSandbox = false) {
    return `https://${environment}.${isSandbox ? "chili-publish-sandbox" : "chili-publish"}.online/rest-api/v1.2`;
}

// Build output CSV file name
export function buildResultFileName(environment, type, directory) {
    const regex = /[/\\ ]/;
    return `${environment}_${type}${(directory.replace(regex, "")) == "" ? "" : `_${directory}`}.csv`
}

// Convert KB/MB/GB file size counts to bytes
function parseToBytes(filesize) {
    const num = filesize.split(" ")[0],
        type = filesize.split(" ")[1];
    let bytes = 0;

    switch (type) {
        case "bytes":
            bytes = parseInt(num);
            break;
        case "Kb":
            bytes = parseInt(num * 1000);
            break;
        case "Mb":
            bytes = parseInt(num * 1000000);
            break;
        case "Gb":
            bytes = parseInt(num * 1000000000);
            break;
        default:
            bytes = -1;
    }

    return bytes;
}