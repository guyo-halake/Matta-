import { executeWindowsCommand, ExecutionResult } from '../tools/windowsControl.js';

export async function validateTerraformPlan(projectPath?: string): Promise<ExecutionResult> {
  const cwd = projectPath || process.cwd();
  return await executeWindowsCommand('terraform fmt -check ; terraform validate', cwd);
}

export async function generateTerraformAwsVpc(projectName: string, region = 'us-east-1'): Promise<string> {
  return `
provider "aws" {
  region = "${region}"
}

resource "aws_vpc" "${projectName}_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${projectName}-vpc"
    Environment = "production"
    ManagedBy   = "OdinBot-IaC"
  }
}

resource "aws_subnet" "${projectName}_public_subnet" {
  vpc_id                  = aws_vpc.${projectName}_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true

  tags = {
    Name = "${projectName}-public-subnet"
  }
}
`.trim();
}
