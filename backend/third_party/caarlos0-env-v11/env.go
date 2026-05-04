package env

import (
	"fmt"
	"os"
	"reflect"
	"strconv"
	"time"
)

var durationType = reflect.TypeOf(time.Duration(0))

func Parse(v any) error {
	value := reflect.ValueOf(v)
	if value.Kind() != reflect.Pointer || value.IsNil() {
		return fmt.Errorf("env: expected non-nil pointer to struct")
	}

	elem := value.Elem()
	if elem.Kind() != reflect.Struct {
		return fmt.Errorf("env: expected pointer to struct")
	}

	typ := elem.Type()
	for i := 0; i < elem.NumField(); i++ {
		field := elem.Field(i)
		fieldType := typ.Field(i)
		key := fieldType.Tag.Get("env")
		if key == "" || !field.CanSet() {
			continue
		}

		raw, ok := os.LookupEnv(key)
		if !ok {
			raw = fieldType.Tag.Get("envDefault")
		}

		if raw == "" && !ok && fieldType.Tag.Get("envDefault") == "" {
			continue
		}

		if err := setField(field, raw); err != nil {
			return fmt.Errorf("env: parse %s: %w", key, err)
		}
	}

	return nil
}

func setField(field reflect.Value, raw string) error {
	switch {
	case field.Type() == durationType:
		value, err := time.ParseDuration(raw)
		if err != nil {
			return err
		}
		field.SetInt(int64(value))
		return nil
	}

	switch field.Kind() {
	case reflect.String:
		field.SetString(raw)
		return nil
	case reflect.Bool:
		value, err := strconv.ParseBool(raw)
		if err != nil {
			return err
		}
		field.SetBool(value)
		return nil
	default:
		return fmt.Errorf("unsupported field type %s", field.Type())
	}
}
