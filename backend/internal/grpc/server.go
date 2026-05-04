package grpc

import (
	"log"
	"net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

type Server struct {
	server *grpc.Server
	addr   string
}

func NewServer(addr string) *Server {
	s := grpc.NewServer()
	reflection.Register(s)
	return &Server{server: s, addr: addr}
}

func (s *Server) Start() error {
	lis, err := net.Listen("tcp", s.addr)
	if err != nil {
		return err
	}
	log.Printf("gRPC server starting on %s", s.addr)
	return s.server.Serve(lis)
}

func (s *Server) Stop() {
	s.server.GracefulStop()
}

func (s *Server) GRPCServer() *grpc.Server {
	return s.server
}
