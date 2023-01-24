import * as aws from '@pulumi/aws';
import { Subnet } from '@pulumi/aws/ec2';
import * as awsx from '@pulumi/awsx';
import * as cloudinit from '@pulumi/cloudinit';
import * as pulumi from '@pulumi/pulumi';
import { Output } from '@pulumi/pulumi';
import { CouchConfig, InstanceConfig, NameConfig, shortName } from './types';

export function couchdbIni(couchConfig: CouchConfig) {
  const hmacDefaultB64 = Buffer.from(couchConfig.accessJwtSignPk).toString('base64');

  return `
[couchdb]
single_node=true
database_dir=/data
view_index_dir=/data

[chttpd]
authentication_handlers = {chttpd_auth, jwt_authentication_handler}, {chttpd_auth, cookie_authentication_handler}, {chttpd_auth, default_authentication_handler}
enable_cors = true
bind_address=0.0.0.0

[chttpd_auth]
require_valid_user = true

[jwt_auth]
required_claims = exp

[jwt_keys]
hmac:_default = ${hmacDefaultB64} 

[cors]
origins = *
credentials = true
methods = GET, PUT, POST, HEAD, DELETE
headers = accept, authorization, content-type, origin, referer, x-csrf-token

[admins]
${couchConfig.dbUsername}=${couchConfig.dbPass}
`
}


// Cloudinit settings for the instance
function userData(couchConfig: CouchConfig) {
  return pulumi.output(cloudinit.getConfig({
    gzip: false,
    base64Encode: false,
    parts: [{
      contentType: 'text/cloud-config',
      content: JSON.stringify({
        packages: [],
        bootcmd: [
          ['cloud-init-per', 'once', 'make_fs', 'mkfs', '-t', 'xfs', '/dev/sdf'],
          ['cloud-init-per', 'once', 'create_dir', 'mkdir', '/data'],
        ],
        mounts: [
          ['/dev/sdf', '/data', 'xfs', 'defaults', '0', '2'],
        ],
        yum_repos: {
          couchdb: {
            name: 'CouchDB',
            baseurl: 'https://apache.jfrog.io/artifactory/couchdb-rpm/el7/$basearch/',
            gpgkey: 'https://couchdb.apache.org/repo/keys.asc https://couchdb.apache.org/repo/rpm-package-key.asc',
            gpgcheck: true,
            enabled: true,
          }
        },        
        repo_update: true,
        repo_upgrade: 'all',
        write_files: [{
          permissions: '0664',
          owner: 'root:root',
          path: '/opt/couchdb/etc/local.d/10-couchdb.ini',
          content: couchdbIni(couchConfig)
        }],
        runcmd: [
        `
        yum install -y couchdb
        systemctl enable couchdb
        chown -R couchdb /data
        service couchdb start
        `,
        ]
      }),
    }],
  })).rendered;
}

// Policy to let us write cloudwatch logs
const cloudWatchPolicy = new aws.iam.Policy("ec2-create-logstream-policy", {
  path: "/",
  description: "Pulumi created policy for CloudWatch logs",
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Action: ["logs:CreateLogStream", "logs:PutLogEvents", "logs:CreateLogGroup"],
      Effect: "Allow",
      Resource: "*",
    }],
  }),
});


// Role we will attach the policy to
const veridaCommonInstanceRole = new aws.iam.Role("VeridaCommonInstanceRole", {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Action: "sts:AssumeRole",
      Effect: "Allow",
      Sid: "",
      Principal: {
        Service: "ec2.amazonaws.com",
      },
    }],
  }),
});

// attach the policy to the role
const policyAttachment = new aws.iam.RolePolicyAttachment("logStreamAttachemnt", {
  role: veridaCommonInstanceRole.name,
  policyArn: cloudWatchPolicy.arn,
});

// create an instance of the role which we will pass to the EC2 instance
const cloudWatchIAMInstanceProfile = new aws.iam.InstanceProfile(`cwIAMInstanceProfile`, {
  role: veridaCommonInstanceRole.name
})



// AMI - Amazon Linux
const ami = aws.ec2.getAmiOutput({
  filters: [{
    name: 'name',
    values: ['amzn2-ami-hvm-*'],
  }],
  owners: ['137112412989'], // This owner ID is Amazon
  mostRecent: true,
});

export function createInstance(vpc: awsx.ec2.Vpc,
  ec2SecurityGroup: aws.ec2.SecurityGroup,
  albSecurityGroup: aws.ec2.SecurityGroup,
  {
    availabilityZone, instanceType, dataVolumeSize, dataVolumeIOPS, keyName, snapshotId,
  }: InstanceConfig,
  nameConfig: NameConfig,
  couchConfig: CouchConfig,
  dlmLifecycleRole: aws.iam.Role) {

  const prefix = shortName(nameConfig);



  const snapshotPolicy = new aws.dlm.LifecyclePolicy(`${prefix}-snapshots`, {
    description: 'Snapshot backups',
    executionRoleArn: dlmLifecycleRole.arn,
    policyDetails: {
      resourceTypes: ['VOLUME'],
      schedules: [{
        copyTags: false,
        createRule: {
          interval: 24,
          intervalUnit: 'HOURS',
          times: '05:45',
        },
        name: 'Daily snapshots',
        retainRule: {
          count: 7,
        },
        tagsToAdd: {
          SnapshotCreator: 'DLM',
        },
        // disabling this because Pulumi won't let me create weekly snapshots
        // }, {
        //   copyTags: false,
        //   createRule: {
        //     cronExpression: '45 1 * * 0 *',
        //   },
        //   name: 'Weekly snapshots',
        //   retainRule: {
        //     count: 4,
        //   },
        //   tagsToAdd: {
        //     SnapshotCreator: 'DLM',
        //   },
      }],
      targetTags: {
        Name: `${prefix}-data`,
      },
    },
    state: 'ENABLED',
  });

  const zoneName = `${aws.config.region}${availabilityZone}`
  console.log(`Looking for az ${zoneName}`)

  let subnet = vpc.subnets.apply(subnets => {
    for (const sn of subnets) {
        
      let tagsCorrect = sn.tagsAll.apply(tags => {
        if (tags["SubnetType"] === "Public") {
          return true;
        } else {
          return false;
        }
      })

      let availabilityZoneCorrect = sn.availabilityZone.apply(az => {        
        if (az === zoneName) {
          return true;
        } else {
          return false;
        }
      })

      if (availabilityZoneCorrect && tagsCorrect) {
        return sn
      } else {
        console.log("Did not find subnet")
      }
    }
    return null;
  })

  // if (subnet === null) {
  //   throw new Error(`Unable to find subnet for availability zone ${zoneName}`)
  // } else {
  //   console.log(subnet)
  // }

  subnet.apply(sn => {
    if (sn == null) {
      throw new Error(`Unable to find subnet for availability zone ${zoneName}`)
    }
  })

  return new aws.ec2.Instance(`${nameConfig.networkName}-${nameConfig.regionName}-${nameConfig.nodeName}`, {
    instanceType,
    availabilityZone: zoneName,
    ami: ami.id,
    keyName,
    iamInstanceProfile: cloudWatchIAMInstanceProfile,
    ebsOptimized: true,
    associatePublicIpAddress: true,
    userData: userData(couchConfig),
    vpcSecurityGroupIds: [ec2SecurityGroup.id],
    //subnetId: vpc.publicSubnetIds.apply(x => x![0]),
    subnetId: (subnet as Output<Subnet>).apply(sn => sn.id),
    disableApiTermination: true,
    rootBlockDevice: {
      volumeSize: 8,
      volumeType: 'gp2',
      encrypted: true
    },
    ebsBlockDevices: [{
      //snapshotId: "", // set this if restoring
      deviceName: '/dev/sdf',
      volumeSize: dataVolumeSize,
      volumeType: 'gp3',
      iops: dataVolumeIOPS,
      throughput: 1000,
      encrypted: true,
      deleteOnTermination: true,
      tags: {
        Name: `${prefix}-data`,
      }
    }],
    tags: {
      Name: `${prefix}-node`
    }
  }, {
    dependsOn: vpc,
  });
}
