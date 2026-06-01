import mongoose, { Schema, Document, Types } from "mongoose";
import { generateCode } from "./counter.model";
import { applyPlugins } from "./global/model.plugin";
import bcrypt from "bcryptjs"
import { UserRole } from "../common/types/enum";

export interface IUser extends Document {
    branch_id: Types.ObjectId | null;
    user_code: string;
    email: string;
    phone?: string;
    password: string;
    role: UserRole;

    full_name: string;
    avatar_url?: string;

    is_active: boolean;
    is_phone_verified: boolean;

    last_login_at?: Date;
    
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        user_code: {
            type: String,
            required: false,
            unique: true,
            sparse: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        phone: {
            type: String,
            unique: true,
            sparse: true,
        },

        password: {
            type: String,
            required: true,
            select: false,
        },

        role: {
            type: String,
            enum: Object.values(UserRole),
            required: true,
        },

        branch_id: {
            type: Schema.Types.ObjectId,
            ref: "Branch",
            default: null,
        },

        full_name: {
            type: String,
            required: true,
        },

        avatar_url: {
            type: String,
            default: null,
        },

        is_active: {
            type: Boolean,
            default: true,
        },

        is_phone_verified: {
            type: Boolean,
            default: false,
        },

        last_login_at: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// index tối ưu login
userSchema.index({ email: 1, role: 1 });

// plugin setup
userSchema.plugin(applyPlugins);

userSchema.pre("validate", function (next) {
    const noBranchRequiredRoles = [
        UserRole.CUSTOMER,
        UserRole.BOSS,
    ];
    console.log(this.role)

    if (noBranchRequiredRoles.includes(this.role)) {
        this.branch_id = null;
        return next();
    }
    console.log(this, this.branch_id)
    if (!this.branch_id) {
        return next(new Error("branchId is required for staff/admin"));
    }

    next();
});

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string) {
    return await bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>("User", userSchema);