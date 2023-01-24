import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { InstanceConfig, NameConfig, shortName } from "./types";

export function createNetworkInfrastructure(nameConfig: NameConfig, instanceConfig: InstanceConfig) {

  // instanceConfig.availabilityZone is *JUST* the zone, not the region. 
  // So construct the full zone name, eg: ap-southeast-2c
  const zoneName = `${aws.config.region}${instanceConfig.availabilityZone}`
  const albSecondZoneName = `${aws.config.region}${instanceConfig.albSecondaryAvailabilityZone}`

  const vpc = new awsx.ec2.Vpc(`${shortName(nameConfig)}-vpc`, {
    availabilityZoneNames: [zoneName, albSecondZoneName],
    cidrBlock: '10.0.0.0/16',
    enableDnsHostnames: true,
    tags: { name: `${shortName(nameConfig)}-vpc` },
    subnetSpecs:[
      {
        type: awsx.ec2.SubnetType.Public,
        cidrMask: 22,
      },
      {
        type: awsx.ec2.SubnetType.Private,
        cidrMask: 20,
      },
    ],
  })

  const [albSecurityGroup, ec2SecurityGroup] = createSecurityGroups(shortName(nameConfig), vpc)

  const dlmLifecycleRole = new aws.iam.Role(`${shortName(nameConfig)}-dlm-lifecycle-role`, {
    assumeRolePolicy: `{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Action": "sts:AssumeRole",
          "Principal": {
            "Service": "dlm.amazonaws.com"
          },
          "Effect": "Allow",
          "Sid": ""
        }
      ]
    }
  `,
  });

  const dlmLifecycle = new aws.iam.RolePolicy(`${shortName(nameConfig)}-dlm-lifecycle-policy`, {
    policy: `{
      "Version": "2012-10-17",
      "Statement": [
         {
            "Effect": "Allow",
            "Action": [
               "ec2:CreateSnapshot",
               "ec2:DeleteSnapshot",
               "ec2:DescribeVolumes",
               "ec2:DescribeSnapshots"
            ],
            "Resource": "*"
         },
         {
            "Effect": "Allow",
            "Action": [
               "ec2:CreateTags"
            ],
            "Resource": "arn:aws:ec2:*::snapshot/*"
         }
      ]
    }
    `,
    role: dlmLifecycleRole.id,
  });

  return { vpc, albSecurityGroup, ec2SecurityGroup, dlmLifecycleRole }
}

function createSecurityGroups(prefix: string, vpc: awsx.ec2.Vpc) {
  const albSg = new aws.ec2.SecurityGroup(`${prefix}-alb-sg`, {
    vpcId: vpc.vpcId,
    ingress: [
      {
        description: 'Allow HTTP',
        protocol: 'tcp',
        fromPort: 80,
        toPort: 80,
        cidrBlocks: ['0.0.0.0/0'],
        ipv6CidrBlocks: ['::/0'],      
      },
      {
        description: 'Allow HTTPS',
        protocol: 'tcp',
        fromPort: 443,
        toPort: 443,
        cidrBlocks: ['0.0.0.0/0'],
        ipv6CidrBlocks: ['::/0'],      
      },
    ],
    egress: [{
      description: 'Allow all',
      fromPort: 0,
      toPort: 0,
      protocol: '-1',
      cidrBlocks: ['0.0.0.0/0'],
      ipv6CidrBlocks: ['::/0'],
    }]
  })  
  const ec2Sg = new aws.ec2.SecurityGroup(`${prefix}-ec2-sg`, {
    vpcId: vpc.vpcId,
    ingress: [ {
        description: 'Allow all from ALB',
        protocol: 'tcp',
        fromPort: 0,
        toPort: 65535,
        securityGroups: [albSg.id],
      }, {  
        description: 'SSH',
        protocol: 'tcp',
        fromPort: 22,
        toPort: 22,
        cidrBlocks: ['0.0.0.0/0'],
      },

    /*
      Below are optional services that can be useful for debugging. 
      
      If uncommented they will be available on the IP address of 
      the EC2 instance (not the loadbalancer)
    
    {
      description: 'CouchDB',
      protocol: 'tcp',
      fromPort: 5984,
      toPort: 5984,
      cidrBlocks: ['0.0.0.0/0'],
      ipv6CidrBlocks: ['::/0'],      
    },  
    */
   
    ],
    egress: [{
      description: 'Allow all',
      fromPort: 0,
      toPort: 0,
      protocol: '-1',
      cidrBlocks: ['0.0.0.0/0'],
      ipv6CidrBlocks: ['::/0'],
    }]
  })

  return [albSg, ec2Sg]
}
