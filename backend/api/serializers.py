from pathlib import Path

from django.contrib.auth.models import User
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Document,ChatConversation, ChatMessage

class RegisterSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True,min_length=6,
        error_messages={"min_length": "Password must contain at least 6 characters."})

    class Meta:
        model = User
        fields = [
            "full_name",
            "email",
            "password",
            "confirm_password",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            "email": {"required": True},
        }

    def validate_email(self, value):
        value = value.strip().lower()

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return value


    def validate_full_name(self, value):
        value = " ".join(value.split())

        if len(value) < 3:
            raise serializers.ValidationError(
                "Full name must contain at least 3 characters."
            )

        return value


    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        return data

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        return data

    def create(self, validated_data):
        full_name = validated_data.pop("full_name")
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")

        name_parts = full_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=password,
            first_name=first_name,
            last_name=last_name,
        )

        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data["email"].strip().lower()
        password = data["password"]

        user = authenticate(
            request=self.context.get("request"),
            username=email,
            password=password,
        )

        if user is None:
            raise serializers.ValidationError(
                "Invalid email or password."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "This account is inactive."
            )

        data["user"] = user
        return data

class DocumentSerializer(serializers.ModelSerializer):
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "file",
            "file_size",
            "uploaded_at",
            "is_indexed",
        ]
        read_only_fields = ["id", "uploaded_at", "file_size", "is_indexed"]
        extra_kwargs = {"title": {"required": False}}
        
    # get_file_size() is called automatically by Django REST Framework when the serializer 
    # converts a Document object into API response data. You don't need to call it manually.
    def get_file_size(self, obj):
        try:
            return obj.file.size
        except (OSError, ValueError):
            return None
        
    def validate_file(self, uploaded_file):
        allowed_extensions = {".pdf", ".txt", ".docx"}
        extension = Path(uploaded_file.name).suffix.lower()

        if extension not in allowed_extensions:
            raise serializers.ValidationError(
                "Only PDF, TXT, and DOCX files are allowed."
            )

        max_size = 20 * 1024 * 1024  # 20 MB

        if uploaded_file.size > max_size:
            raise serializers.ValidationError(
                "File size must not exceed 20 MB."
            )

        return uploaded_file
    
class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "role",
            "content",
            "sources",
            "created_at",
        ]
        
class ChatConversationSerializer(serializers.ModelSerializer):
    messages = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversation
        fields = [
            "id",
            "title",
            "created_at",
            "updated_at",
            "messages",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "messages",
        ]

    def get_messages(self, obj):
        messages = obj.messages.order_by("created_at", "id")
        return ChatMessageSerializer(messages, many=True).data