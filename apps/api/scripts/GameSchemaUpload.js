import mongoose from 'mongoose';
import Game from './gameModel.js';

const ATLAS_URI = "mongodb+srv://Large_Project_User:Cop4331C@cluster0.jlixyxr.mongodb.net/Large_Project_DB?retryWrites=true&w=majority";

export async function GameUpload(ID,status,guesses,maxGuesses,start,end) {
  try {

    await mongoose.connect(ATLAS_URI);
    console.log("Connected to MongoDB Atlas!");

    const newGame = new Game({
    userID: ID,
    status: status,
    guesses: guesses,
    maxGuesses: maxGuesses,
    startedAt: start,
    endedAt: end,
    });

    await newGame.save(); 
    console.log("Document uploaded successfully!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    mongoose.disconnect();
  }
}

