export type DomainConfig = {
  domain: string
  subdomain: string
};

export const shortName = function(nameConfig: NameConfig): string {
  return `${nameConfig.nodeName}-${nameConfig.regionName}.${nameConfig.networkName}`
};

export const fqd = function(nameConfig: NameConfig): string {
  return `${shortName(nameConfig)}.${nameConfig.rootDomain}`
};

export function alphaonly_name(nameConfig: NameConfig): string {
  return `${nameConfig.nodeName}-${nameConfig.networkName}`
}

export type InstanceConfig = {
  availabilityZone: string
  albSecondaryAvailabilityZone: string
  instanceType: string
  dataVolumeSize: number
  dataVolumeIOPS: number
  keyName: string // the SSH key must exist in the cloud!
  snapshotId?: string // add this to the config to restore from the backend
};

export type NameConfig = {
  networkName: "devnet" | "acacia" | "myrtle"
  nodeName: string
  regionName: string
  provider: "aws" | "gcp"
  rootDomain: string
}

export type CouchConfig = {
  accessJwtSignPk: string,
  dbPass: string,
  dbUsername: string,
}

export type Config = {
  nameConfig: NameConfig
  instanceConfig: InstanceConfig
  couchConfig: CouchConfig
};