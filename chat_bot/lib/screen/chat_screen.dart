import 'dart:ffi';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../model/chat_message.dart';
import '../services/api_service.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final List<ChatModel> _messages = [];
  final ApiService _apiService = ApiService();


  bool _isTyping = false;
  bool _ispdfProcessed = false;
  String? _sessionId;
  String _hintText= 'Type a message...';

  void _pickAndUploadPDF() async {
    setState(() {
      _ispdfProcessed = true;
    });
    try {
      print("step 1");

      final result = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: ['pdf']
      );

      if(result != null){
        final platformFile = result.files.first;
        Uint8List? fileBytes;
        final fileName = result.files.first.name;

        print("step 2");

        if (platformFile.path != null) {
          print("Reading file from path: ${platformFile.path}");
          final file = File(platformFile.path!);
          fileBytes = await file.readAsBytes();
        } else {
          // Fallback for web where path is null but bytes are available
          print("Reading file from memory (web).");
          fileBytes = platformFile.bytes;
        }

        if(fileBytes != null){
          print("File bytes loaded successfully. Uploading...");
          final responseMap = await _apiService.uploadPDF(fileBytes, fileName);

          if(mounted){
            if(responseMap['sessionId'] != null){
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text("PDF uploaded successfully")),
              );
              setState(() {
                _sessionId = responseMap['sessionId'];
                _hintText = "Ask about the uploaded PDF.... ";
                _messages.add(ChatModel(text: "PDF uploaded successfully", isUser: false));
              });
            }
          }else{
            if(responseMap['error'] != null){
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(responseMap['error'])),
              );
            }
          }
        }
      }
    }catch(e){
        print("--- AN ERROR OCCURRED IN THE CATCH BLOCK ---");
        print(e.toString());
        if(mounted){
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text("Error uploading PDF : $e"), backgroundColor: Colors.red,),
          );
        }
    }finally{
      if(mounted){
        setState(() {
          _ispdfProcessed = false;
        });
      }
    }
  }

  void _sendMessage() async {
    final text = _controller.text;
    if (text.trim().isEmpty) return;

    // Clear the input field and add user's message to the list
    _controller.clear();
    setState(() {
      _messages.add(ChatModel(text: text, isUser: true));
      _isTyping = true;
    });

    try {
      // Send the prompt and the current sessionId (if it exists)
      final responseMap = await _apiService.sendMessage(text, sessionId: _sessionId);
      final responseText = responseMap['response'] ?? 'Sorry, I could not get a response.';

      if (mounted) {
        setState(() {
          _messages.add(ChatModel(text: responseText, isUser: false));
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.add(ChatModel(text: 'An error occurred: $e', isUser: false));
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isTyping = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: const Text("ChatBot"),
          actions: [
            IconButton(
              onPressed:_ispdfProcessed ? null : _pickAndUploadPDF,
              icon: const Icon(Icons.upload),
              tooltip: "Upload PDF",
            ),
          ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                return ListTile(
                  title: Align(
                    alignment: message.isUser
                        ? Alignment.centerRight
                        : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 5.0),
                      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
                      decoration: BoxDecoration(
                        color: message.isUser ? Colors.blue : Colors.green,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child:message.isUser? Text(
                          message.text,
                          style: TextStyle(
                            color: Colors.white,
                          ) ,
                      ) : MarkdownBody(
                        data: message.text,
                        selectable: true,
                        styleSheet: MarkdownStyleSheet(
                          p: TextStyle(color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          if (_isTyping)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: CircularProgressIndicator(),
            ),

          if(_ispdfProcessed)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: CircularProgressIndicator(),
            ),

          Padding(
           padding: const EdgeInsets.symmetric(vertical: 10),
           child: Container(
             padding: EdgeInsets.fromLTRB(10, 0, 3, 0),
             decoration: BoxDecoration(
               color: Colors.grey[200],
               borderRadius: BorderRadius.circular(20),
               border: Border.all(
                 color: Colors.black,
                 width: 1,
               ),
             ),
             child: Row(
               children: [
                 Expanded(
                   child: TextField(
                     controller: _controller,
                     decoration: InputDecoration(
                       hintText: _hintText,
                     ),
                     onSubmitted: _isTyping ? null : (_) => _sendMessage(),
                   ),
                 ),
                 IconButton(
                   icon: const Icon(Icons.send),
                   onPressed: _isTyping ? null : _sendMessage,
                   style: IconButton.styleFrom(
                     backgroundColor: Theme.of(context).colorScheme.primary,
                     foregroundColor: Theme.of(context).colorScheme.onPrimary,
                   ),
                 ),
               ],
             ),
           ),
          )
        ],
      ),
    );
  }
}
