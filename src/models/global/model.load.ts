import fs from "fs";
import path from "path";

export const loadModels = () => {
    const modelsPath = path.join(__dirname, "..");

    fs.readdirSync(modelsPath).forEach((file) => {
        if (file.endsWith(".js")) {
            require(path.join(modelsPath, file));
        }
    });

    console.log("All models loaded successfully");
};