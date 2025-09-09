import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenvFlow from "dotenv-flow";
import routesUser from "./routes/user.route";

dotenvFlow.config();
const server = express();

server.use(cors());
server.use(express.urlencoded({ extended: false }));
server.use(bodyParser.json());

server.use("/api/v1/user", routesUser);

server.listen(process.env.SERVER_PORT, () => {
  console.log(`Server running in the port ${process.env.PORT_SERVER}`);
});
