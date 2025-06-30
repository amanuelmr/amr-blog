const User = require("../models/User");

exports.generateAccessTokenAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;

        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    } catch (error) {
        console.error("Token generation error:", error);
        throw new Error(`Failed to generate tokens: ${error.message}`);
    }
}