import * as aws from "@pulumi/aws";
import { Instance } from "@pulumi/aws/ec2";
import * as awsx from "@pulumi/awsx";
import { Output } from "@pulumi/pulumi";

import { alphaonly_name, fqd, NameConfig, shortName } from './types';

export function setupEndpoints(nameConfig: NameConfig, ec2Instance: Instance,
  vpc: awsx.ec2.Vpc,
  albSecurityGroup: aws.ec2.SecurityGroup
  ): Output<string> {

  const loadBalancer = new aws.alb.LoadBalancer(`${alphaonly_name(nameConfig)}-alb`, {
    name: `${alphaonly_name(nameConfig)}-alb`,
    loadBalancerType: "application",
    securityGroups: [albSecurityGroup.id],
    enableHttp2: true, 
    subnets: vpc.publicSubnetIds
  });  

  const tg = new aws.lb.TargetGroup(`${alphaonly_name(nameConfig)}-tg`, {
      port: 5984,
      protocol: 'HTTP',
      targetType: 'instance',
      healthCheck: {
        path: '/',
        interval: 120,
        unhealthyThreshold: 5,
      },
      vpcId: vpc.vpcId
    }, { dependsOn: ec2Instance });
  
  const tgAttachment = new aws.lb.TargetGroupAttachment(`${alphaonly_name(nameConfig)}-tgAttach`, {
    targetGroupArn: tg.arn,
    targetId: ec2Instance.id,
    port: 5984
  }, {dependsOn: tg})
  

  //// Setup SSL
  const hostedZoneId = aws.route53.getZoneOutput({
    name: `${nameConfig.networkName}.${nameConfig.rootDomain}`
  });

  const cert = aws.acm.getCertificateOutput({
    domain: `*.${nameConfig.networkName}.${nameConfig.rootDomain}`,
    mostRecent: true,
    statuses: ["ISSUED"],
  });

  //// Setup DNS 
  const subdomainDNS = new aws.route53.Record(`${fqd(nameConfig)}-record`, {
    name: `${fqd(nameConfig)}`,
    aliases: [{
      name: loadBalancer.dnsName,
      zoneId: loadBalancer.zoneId,
      evaluateTargetHealth: false,
    }],
    type: 'A',
    zoneId: hostedZoneId.id,
  });


  const storageNodeListener = new aws.lb.Listener(`${shortName(nameConfig)}-https`, {
    loadBalancerArn: loadBalancer.arn,
    port: 443,
    protocol: 'HTTPS',
    certificateArn: cert.arn,
    defaultActions: [{
      type: "forward",
      targetGroupArn: tg.arn,
    }]
  }, { dependsOn: [loadBalancer, tg] });


  const redirectListener = new aws.lb.Listener(`${shortName(nameConfig)}-http`, {
    loadBalancerArn: loadBalancer.arn,
    port: 80,
    protocol: 'HTTP',
    defaultActions: [{
      type: "redirect",
      redirect: {
        port: "443",
        protocol: "HTTPS",
        statusCode: "HTTP_302",
      }
    }]
  }, { dependsOn: [loadBalancer, tg]  });


  return subdomainDNS.name

}