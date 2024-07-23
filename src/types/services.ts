import { Client } from "@mtkruto/node";
import Keyv from "keyv";

export type Services = {
    client: Client;
    keyv: Keyv;
};
