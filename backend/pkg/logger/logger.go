package logger

import (
	"os"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	once     sync.Once
	instance *zap.Logger
)

type bufferCore struct {
	zapcore.Core
}

func (c *bufferCore) Write(entry zapcore.Entry, fields []zapcore.Field) error {
	le := LogEntry{
		Timestamp: entry.Time.Format("2006-01-02T15:04:05.000Z07:00"),
		Level:     entry.Level.String(),
		Message:   entry.Message,
		Caller:    entry.Caller.String(),
	}
	if len(fields) > 0 {
		enc := zapcore.NewMapObjectEncoder()
		for _, f := range fields {
			f.AddTo(enc)
		}
		le.Fields = enc.Fields
	}
	GlobalBuffer.Write(le)
	return c.Core.Write(entry, fields)
}

func (c *bufferCore) Check(entry zapcore.Entry, ce *zapcore.CheckedEntry) *zapcore.CheckedEntry {
	if c.Core.Enabled(entry.Level) {
		return ce.AddCore(entry, c)
	}
	return ce
}

func Init() *zap.Logger {
	once.Do(func() {
		var (
			err  error
			base *zap.Logger
		)
		if os.Getenv("GIN_MODE") == "release" {
			cfg := zap.NewProductionConfig()
			cfg.EncoderConfig.TimeKey = "ts"
			cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
			base, err = cfg.Build()
		} else {
			cfg := zap.NewDevelopmentConfig()
			cfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
			base, err = cfg.Build()
		}
		if err != nil {
			panic(err)
		}
		instance = base.WithOptions(zap.WrapCore(func(core zapcore.Core) zapcore.Core {
			return &bufferCore{Core: core}
		}))
	})
	return instance
}
