import fs from "fs";
import path from "path";

export const loadModels = () => {
    const modelsPath = path.join(__dirname, "../models");

    fs.readdirSync(modelsPath).forEach((file) => {
        // chỉ load file ts/js model
        if (file.endsWith(".ts") || file.endsWith(".js")) {
            require(path.join(modelsPath, file));
        }
    });

    console.log("All models loaded successfully");
};