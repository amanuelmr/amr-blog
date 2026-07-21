const User = require("../models/User");
const jwt = require('jsonwebtoken')
require('dotenv').config()


module.exports = async(req, res, next)=>{
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if(!token){
        return res.status(401).json({msg:'No token, authorization denied'})
    }
    try{
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
            algorithms: ["HS256"],
        });

        const user = await User.findById(decoded._id).select('-password -refreshToken');

        if(!user){
            return res.status(404).json({msg:'No user found'})
        }
        req.user = user
        next()
    }catch{
        // Do not leak the underlying jwt error detail to the client.
        res.status(401).json({msg:'Invalid or expired token'})
    }

    
}