import express from 'express';
import {config} from 'dotenv';
import cors from 'cors';
config();
const app = express();

app.use(cors());
app.use(express.json());
app.listen(process.env.PORT,()=>{
    console.log(`Server is running on port ${process.env.PORT}`);
});

app.get('/',(req,res)=>{
    res.send('Server wokring fine👌👌');
})