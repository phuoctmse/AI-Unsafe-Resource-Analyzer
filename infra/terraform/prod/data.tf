# Data sources — query existing AWS resources instead of hardcoding values

# Current AWS account ID and caller identity
# Usage: data.aws_caller_identity.current.account_id
data "aws_caller_identity" "current" {}

# Current AWS region (from provider config)
# Usage: data.aws_region.current.name
data "aws_region" "current" {}

# Route 53 hosted zone — must already exist in your account
# Usage: data.aws_route53_zone.main.zone_id
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# Latest Amazon Linux 2023 AMI (used if you ever need EC2 bastion)
# Usage: data.aws_ami.amazon_linux.id
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}
