import mongoose from 'mongoose';
import Token from './tokensModel.js';

const ATLAS_URI = "mongodb+srv://Large_Project_User:Cop4331C@cluster0.jlixyxr.mongodb.net/Large_Project_DB?retryWrites=true&w=majority";

export async function TokenUpload(ID,TokenType,Hash,expiration) {
  try {
    
    await mongoose.connect(ATLAS_URI);
    console.log("Connected to MongoDB Atlas!");

    
    const newToken = new Token({
    userID: ID, 
    type: TokenType,
    tokenHash: Hash,
    expiresAt: expiration,
    });

    await newToken.save(); 
    console.log("Document uploaded successfully!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    mongoose.disconnect();
  }
}


