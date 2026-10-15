output "public_ip" {
  description = "Elastic IP del nodo K3s."
  value       = aws_eip.k3s.public_ip
}

output "nip_io_domain" {
  description = "Dominio gratuito que resuelve a la EIP (sirve para Let's Encrypt sin comprar dominio)."
  value       = "${replace(aws_eip.k3s.public_ip, ".", "-")}.nip.io"
}

output "ssh_command" {
  value = "ssh ubuntu@${aws_eip.k3s.public_ip}"
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.address
}

output "database_url" {
  description = "Cadena de conexión para el Secret de Kubernetes."
  value       = "postgresql://${var.db_username}:${random_password.db.result}@${aws_db_instance.postgres.address}:5432/${var.db_name}"
  sensitive   = true
}
