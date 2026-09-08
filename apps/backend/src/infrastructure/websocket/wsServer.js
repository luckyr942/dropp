import { WebSocket } from "ws";
import { redisGeo } from "../redis/redisindex";


// Map of active connections: key -> ws client
const driverSockets = new Map();  //driverId -> ws
const rideSockets = new Map();   //rideId -> ws


//setup for ws
export function  setupWebSockets(htt)
