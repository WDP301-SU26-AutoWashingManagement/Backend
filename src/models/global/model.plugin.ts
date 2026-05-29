import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import mongooseDelete from "mongoose-delete";

export function autoTrimStrings(schema: Schema) {
    schema.pre("save", function (next) {
        const doc = this as any;

        for (const key of Object.keys(doc.toObject())) {
            if (typeof doc[key] === "string") {
                doc[key] = doc[key].trim();
            }
        }

        next();
    });
}

export function applyPlugins(schema: mongoose.Schema) {
    schema.plugin(autoTrimStrings);
    schema.plugin(mongoosePaginate);
    schema.plugin(mongooseDelete, {
        deletedAt: true,
        overrideMethods: "all",
    });
}