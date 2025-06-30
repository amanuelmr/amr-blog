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
        const decoded = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
       
        const user = await User.findById(decoded._id).select('-password -refreshToken -verificationToken');

        if(!user){
            return res.status(404).json({msg:'No user found'})
        }
        req.user = user
        next()
    }catch(error){
        // console.error(error.message)
        res.status(401).json({msg:error.message})
    }

    
}