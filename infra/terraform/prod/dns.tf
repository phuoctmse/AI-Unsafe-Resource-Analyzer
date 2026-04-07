# Route 53 DNS Records — alias to ALB
# Zone already exists: data.aws_route53_zone.main (queried in data.tf)

# app.domain.com → ALB (Next.js frontend)
resource "aws_route53_record" "app" {
  zone_id = local.zone_id
  name    = local.app_fqdn
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# api.domain.com → ALB (Hono backend + Socket.io)
resource "aws_route53_record" "api" {
  zone_id = local.zone_id
  name    = local.api_fqdn
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
