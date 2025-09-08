import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenvFlow from "dotenv-flow";

dotenvFlow.config();
const server = express();

server.use(cors());
server.use(express.urlencoded({ extended: false }));
server.use(bodyParser.json());

server.listen(process.env.SERVER_PORT, () => {
  console.log(`Server running in the port ${process.env.PORT_SERVER}`);
});
