# ACM TLS Certificate — SAN covers app.domain + api.domain
# DNS validation via Route 53 (zone already exists — data.aws_route53_zone.main)

resource "aws_acm_certificate" "main" {
  domain_name = var.domain_name

  subject_alternative_names = [
    local.app_fqdn,
    local.api_fqdn,
  ]

  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "${local.name_prefix}-cert" }
}

# Create Route 53 validation records for each unique domain_validation_option
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = local.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60

  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}
