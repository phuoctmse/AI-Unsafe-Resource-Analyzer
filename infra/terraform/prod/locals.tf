# Computed values derived from variables and data sources
# Use local.* instead of repeating the same expression everywhere

locals {
  # Consistent name prefix for all resources: "aura-prod"
  name_prefix = "${var.project}-prod"

  # AWS account ID — avoids hardcoding in ECR URIs, IAM policies
  account_id = data.aws_caller_identity.current.account_id

  # Region — avoids hardcoding in ARNs
  region = data.aws_region.current.id

  # Route 53 zone ID — used in ACM validation and DNS records
  zone_id = data.aws_route53_zone.main.zone_id

  # Full domain names for each service
  app_fqdn = "app.${var.domain_name}"
  api_fqdn = "api.${var.domain_name}"

  # ECR base URL — used when referencing image URIs
  ecr_base_url = "${local.account_id}.dkr.ecr.${local.region}.amazonaws.com"
}
