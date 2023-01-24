import { Instance } from "@pulumi/aws/ec2";
import * as pulumi from "@pulumi/pulumi";
import * as ec2 from './ec2';
import { setupEndpoints } from './endpoints';
import { createNetworkInfrastructure } from './network';
import { Config } from './types';



// get Pulumi config
const config = new pulumi.Config();

const serverConfig = config.require('server');

const server = JSON.parse(serverConfig) as Config

// First setup the network and security infrastructure (VPC, security groups) needed
const { vpc, albSecurityGroup, ec2SecurityGroup, dlmLifecycleRole } = createNetworkInfrastructure(server.nameConfig, server.instanceConfig)

// now create this EC2 Node
const ec2Instance: Instance = ec2.createInstance(vpc, ec2SecurityGroup, albSecurityGroup,
                                                server.instanceConfig, 
                                                server.nameConfig, server.couchConfig, dlmLifecycleRole)

// Setup the endpoint including DNS
const endpoint = setupEndpoints(server.nameConfig, ec2Instance, vpc, albSecurityGroup);

export const ec2Ip = ec2Instance.publicIp;
export const ec2Hostname = ec2Instance.publicDns;                                            
export const endpointDNS = endpoint;


